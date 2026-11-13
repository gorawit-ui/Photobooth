#!/usr/bin/env node
/**
 * Sony Bridge — the small local program between the photo booth website and
 * a real camera on USB. The website asks it to fire the camera's shutter and
 * gets back the camera's own full-resolution JPEG (24 MP on the a7C), instead
 * of a frame from a webcam-quality video stream.
 *
 *   node tether/sony-bridge.mjs                 # real camera through gphoto2 (macOS / Linux)
 *   double-click tether/Start Sony Bridge.command  (macOS, same thing)
 *   node tether/sony-bridge.mjs --backend mock  # no camera: test the website on any computer
 *
 * Options:
 *   --backend auto|gphoto2|mock   default auto (gphoto2 if installed, else mock)
 *   --port 5123                   listens on 127.0.0.1 only
 *   --dir <folder>                where originals are kept (default ~/Pictures/PhotoBooth-Sony)
 *   --allow-origin <url>          extra website allowed to use the bridge (repeatable)
 *
 * API (all JSON unless noted; CORS for the allowed websites only):
 *   GET  /status        { ok, version, backend, camera, ready, busy, liveview }
 *   POST /capture       fire the shutter → { id, url, bytes, ms }
 *   GET  /photos/<file> the JPEG (image/jpeg)
 *   GET  /liveview      live view as MJPEG (multipart/x-mixed-replace)
 *
 * No dependencies: Node 18+ only.
 */

import { execFile, spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = 1;
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- options
function parseArgs(argv) {
  const opts = { backend: 'auto', port: 5123, dir: path.join(os.homedir(), 'Pictures', 'PhotoBooth-Sony'), origins: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--backend') opts.backend = next();
    else if (a === '--port') opts.port = Number(next());
    else if (a === '--dir') opts.dir = path.resolve(next());
    else if (a === '--allow-origin') opts.origins.push(next().replace(/\/$/, ''));
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else {
      console.error(`Unknown option: ${a} (see --help)`);
      process.exit(1);
    }
  }
  return opts;
}
const opts = parseArgs(process.argv.slice(2));
mkdirSync(opts.dir, { recursive: true });

/** Websites allowed to control the camera. Anything else gets 403. */
const ALLOWED = [
  /^https:\/\/photobooth-tdfb\.vercel\.app$/,
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/,
  ...opts.origins.map((o) => new RegExp(`^${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)),
];

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, timeoutMs = 20000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

/** One USB job at a time (gphoto2 cannot share the camera). */
let chain = Promise.resolve();
function exclusive(job) {
  const p = chain.then(job, job);
  chain = p.catch(() => {});
  return p;
}

// ---------------------------------------------------------------- live view fan-out
/** Browsers watching /liveview. Frames are pushed to all of them. */
const viewers = new Set();
let lastFrame = null;
function broadcast(jpeg) {
  lastFrame = jpeg;
  for (const res of viewers) writeFrame(res, jpeg);
}
function writeFrame(res, jpeg) {
  if (res.writableNeedDrain) return; // slow viewer: skip this frame
  res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`);
  res.write(jpeg);
  res.write('\r\n');
}

/** Splits a stream of back-to-back JPEGs (gphoto2 --capture-movie --stdout). */
function jpegSplitter(onFrame) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const start = buf.indexOf(Buffer.from([0xff, 0xd8]));
      if (start < 0) {
        buf = Buffer.alloc(0);
        return;
      }
      const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
      if (end < 0) {
        if (start > 0) buf = buf.subarray(start);
        if (buf.length > 8 * 1024 * 1024) buf = Buffer.alloc(0); // garbage guard
        return;
      }
      onFrame(Buffer.from(buf.subarray(start, end + 2)));
      buf = buf.subarray(end + 2);
    }
  };
}

// ---------------------------------------------------------------- backends
function mockBackend() {
  const sample = path.join(HERE, 'mock', 'sample.jpg');
  const preview = readFileSync(path.join(HERE, 'mock', 'preview.jpg'));
  let timer = null;
  return {
    name: 'mock',
    liveview: true,
    async detect() {
      return 'Mock camera (ทดสอบ ไม่มีกล้องจริง)';
    },
    async capture(id) {
      await sleep(900); // about what a real camera takes to shoot + transfer
      const file = `${id}.jpg`;
      copyFileSync(sample, path.join(opts.dir, file));
      return file;
    },
    startLiveview() {
      if (timer) return;
      timer = setInterval(() => broadcast(preview), 100);
    },
    stopLiveview() {
      clearInterval(timer);
      timer = null;
    },
  };
}

function gphoto2Backend() {
  let movie = null; // the running `gphoto2 --capture-movie` process
  let wantLive = false;
  let model = null;
  let restartTimer = null;

  async function freeUsbOnMac() {
    // macOS's own camera daemon grabs PTP cameras; gphoto2 then "could not claim the USB device".
    if (process.platform === 'darwin') await run('killall', ['-9', 'ptpcamerad'], 3000);
  }

  function spawnMovie() {
    if (movie || !wantLive) return;
    const p = spawn('gphoto2', ['--capture-movie', '--stdout'], { stdio: ['ignore', 'pipe', 'pipe'] });
    movie = p;
    p.stdout.on('data', jpegSplitter(broadcast));
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('exit', () => {
      if (movie === p) movie = null;
      if (wantLive && !stopping) {
        if (/claim/i.test(err)) void freeUsbOnMac();
        log('live view stopped, restarting…', err.trim().split('\n').pop() ?? '');
        clearTimeout(restartTimer);
        restartTimer = setTimeout(spawnMovie, 1500);
      }
    });
  }
  let stopping = false;
  async function killMovie() {
    clearTimeout(restartTimer);
    const p = movie;
    if (!p) return;
    stopping = true;
    await new Promise((resolve) => {
      p.once('exit', resolve);
      p.kill('SIGINT'); // lets gphoto2 end live view cleanly
      setTimeout(() => p.kill('SIGKILL'), 1500);
    });
    movie = null;
    stopping = false;
    await sleep(150);
  }

  return {
    name: 'gphoto2',
    liveview: true,
    async detect() {
      if (movie) return model; // camera busy streaming: it is there
      return exclusive(async () => {
        const r = await run('gphoto2', ['--auto-detect'], 8000);
        const lines = r.stdout.split('\n').slice(2).map((l) => l.trim()).filter(Boolean);
        model = lines.length ? lines[0].replace(/\s+usb:.*$/i, '').trim() : null;
        return model;
      });
    },
    async capture(id) {
      return exclusive(async () => {
        const live = !!movie;
        await killMovie();
        try {
          const args = ['--capture-image-and-download', '--force-overwrite', '--filename', path.join(opts.dir, `${id}.%C`)];
          let r = await run('gphoto2', args, 30000);
          if (!r.ok && /claim/i.test(r.stderr)) {
            await freeUsbOnMac();
            r = await run('gphoto2', args, 30000);
          }
          if (!r.ok) throw new Error(r.stderr.trim().split('\n').pop() || 'gphoto2 failed');
          const files = readdirSync(opts.dir).filter((f) => f.startsWith(`${id}.`));
          const jpg = files.find((f) => /\.jpe?g$/i.test(f));
          if (!jpg) {
            throw new Error(
              files.length ? `กล้องส่งมาแค่ ${files.join(', ')} ให้ตั้งกล้องเป็น JPEG (หรือ RAW+JPEG)` : 'ไม่ได้รับไฟล์จากกล้อง',
            );
          }
          return jpg;
        } finally {
          if (live && wantLive) spawnMovie();
        }
      });
    },
    startLiveview() {
      wantLive = true;
      void exclusive(async () => spawnMovie());
    },
    stopLiveview() {
      wantLive = false;
      void exclusive(killMovie);
    },
  };
}

async function pickBackend() {
  if (opts.backend === 'mock') return mockBackend();
  const has = (await run('gphoto2', ['--version'], 5000)).ok;
  if (opts.backend === 'gphoto2' && !has) {
    console.error('ไม่พบ gphoto2 — macOS: brew install gphoto2 · Linux: sudo apt install gphoto2');
    process.exit(1);
  }
  if (has) return gphoto2Backend();
  if (process.platform === 'darwin' || process.platform === 'linux') {
    // On the event Mac a silent fallback to fake photos would be worse than stopping.
    console.error('ไม่พบ gphoto2 — ติดตั้งก่อน: brew install gphoto2  (ถ้าแค่จะทดสอบหน้าเว็บ ใช้ --backend mock)');
    process.exit(1);
  }
  log('Windows: ไม่มี gphoto2 จึงใช้กล้องจำลอง (mock) — ใช้ทดสอบหน้าเว็บได้ แต่ไม่ได้คุมกล้องจริง');
  return mockBackend();
}
const backend = await pickBackend();

// ---------------------------------------------------------------- HTTP
let busy = false;
let camera = null;
let lastDetect = 0;
let detecting = null;
/** Never blocks /status for long: detection runs in the background once a camera was seen. */
async function currentCamera() {
  if (!busy && !detecting && Date.now() - lastDetect > 4000) {
    lastDetect = Date.now();
    detecting = backend
      .detect()
      .then((c) => (camera = c))
      .catch(() => (camera = null))
      .finally(() => (detecting = null));
    if (!camera) await detecting; // nothing known yet: wait for the answer
  }
  return camera;
}

let stopTimer = null;
function onViewerJoin() {
  clearTimeout(stopTimer);
  backend.startLiveview();
}
function onViewerLeave() {
  clearTimeout(stopTimer);
  if (!viewers.size) stopTimer = setTimeout(() => !viewers.size && backend.stopLiveview(), 3000);
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true; // not a browser page (curl, the bridge's own help page)
  if (!ALLOWED.some((re) => re.test(origin))) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Chrome: an https site may reach this local program only with these.
  if (req.headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

let counter = 0;
const newId = () => {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(++counter % 1000, 3)}`;
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!cors(req, res)) {
    log(`blocked request from ${req.headers.origin}`);
    return json(res, 403, { ok: false, error: 'origin not allowed', hint: 'start with --allow-origin <url>' });
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === 'GET' && url.pathname === '/status') {
      const cam = await currentCamera();
      return json(res, 200, {
        ok: true,
        version: VERSION,
        backend: backend.name,
        camera: cam,
        ready: !!cam && !busy,
        busy,
        liveview: backend.liveview,
      });
    }

    if (req.method === 'POST' && url.pathname === '/capture') {
      if (busy) return json(res, 409, { ok: false, error: 'busy' });
      busy = true;
      const t0 = Date.now();
      const id = newId();
      try {
        const file = await backend.capture(id);
        const bytes = statSync(path.join(opts.dir, file)).size;
        const ms = Date.now() - t0;
        log(`shot ${file} · ${(bytes / 1e6).toFixed(1)} MB · ${ms} ms`);
        return json(res, 200, { ok: true, id, url: `/photos/${file}`, bytes, ms });
      } catch (err) {
        log('capture failed:', err.message);
        lastDetect = 0;
        return json(res, 500, { ok: false, error: err.message });
      } finally {
        busy = false;
      }
    }

    const photo = url.pathname.match(/^\/photos\/([\w.-]+\.jpe?g)$/i);
    if (req.method === 'GET' && photo) {
      const file = path.join(opts.dir, photo[1]);
      if (!existsSync(file)) return json(res, 404, { ok: false, error: 'not found' });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'Content-Length': statSync(file).size });
      return createReadStream(file).pipe(res);
    }

    if (req.method === 'GET' && url.pathname === '/liveview') {
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      viewers.add(res);
      if (lastFrame) writeFrame(res, lastFrame);
      onViewerJoin();
      req.on('close', () => {
        viewers.delete(res);
        onViewerLeave();
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>Sony Bridge</title>
<body style="font-family:system-ui;background:#111;color:#eee;padding:24px">
<h1>Sony Bridge ทำงานอยู่</h1><p>backend: <b>${backend.name}</b> · รูปต้นฉบับเก็บที่ <code>${opts.dir}</code></p>
<p><a style="color:#fc6" href="/status">/status</a></p>
<img src="/liveview" style="max-width:640px;width:100%;border:1px solid #444" alt="live view"></body>`);
    }

    json(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    log('error:', err);
    if (!res.headersSent) json(res, 500, { ok: false, error: String(err?.message ?? err) });
  }
});

server.listen(opts.port, '127.0.0.1', async () => {
  log(`Sony Bridge v${VERSION} · backend ${backend.name} · http://127.0.0.1:${opts.port}`);
  log(`รูปต้นฉบับเก็บที่ ${opts.dir}`);
  const cam = await currentCamera();
  log(cam ? `พบกล้อง: ${cam}` : 'ยังไม่พบกล้อง — เสียบ USB และตั้งกล้องเป็น PC Remote');
});

process.on('SIGINT', () => {
  backend.stopLiveview();
  setTimeout(() => process.exit(0), 300);
});
