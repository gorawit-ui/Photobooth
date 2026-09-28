import type { CameraErrorKind } from '../lib/camera';
import { detectBrowser, isIPad, isStandalone, type BrowserKind } from '../lib/device';

type GuideKey = 'chrome' | 'edge' | 'safari-mac' | 'ipad';

const GUIDES: Record<GuideKey, { title: string; steps: string[] }> = {
  chrome: {
    title: 'Google Chrome',
    steps: [
      'คลิกไอคอนกล้อง 🎥 หรือไอคอนตั้งค่าเว็บไซต์ (ซ้ายสุดของแถบที่อยู่)',
      'ที่หัวข้อ "กล้อง" เลือก "อนุญาต"',
      'กดปุ่ม "ลองอีกครั้ง" ด้านล่าง หรือโหลดหน้าเว็บใหม่',
      'ถ้ายังไม่ได้: เปิด chrome://settings/content/camera แล้วลบเว็บนี้ออกจาก "ไม่อนุญาต"',
      'บน macOS: การตั้งค่าระบบ › ความเป็นส่วนตัวและความปลอดภัย › กล้อง › เปิดให้ Google Chrome',
      'บน Windows: Settings › Privacy & security › Camera › เปิด "Let desktop apps access your camera"',
    ],
  },
  edge: {
    title: 'Microsoft Edge',
    steps: [
      'คลิกไอคอนแม่กุญแจ 🔒 ซ้ายของแถบที่อยู่ › "สิทธิ์สำหรับไซต์นี้"',
      'ตั้งค่า "กล้อง" เป็น "อนุญาต"',
      'กดปุ่ม "ลองอีกครั้ง" ด้านล่าง หรือโหลดหน้าเว็บใหม่',
      'ถ้ายังไม่ได้: เปิด edge://settings/content/camera แล้วลบเว็บนี้ออกจากรายการที่บล็อก',
      'บน Windows: Settings › Privacy & security › Camera › เปิดสิทธิ์ให้ Microsoft Edge',
      'บน macOS: การตั้งค่าระบบ › ความเป็นส่วนตัวและความปลอดภัย › กล้อง › เปิดให้ Microsoft Edge',
    ],
  },
  'safari-mac': {
    title: 'Safari บน Mac',
    steps: [
      'เมนู Safari › "การตั้งค่าสำหรับเว็บไซต์นี้..." (หรือคลิกขวาที่แถบที่อยู่)',
      'ตั้งค่า "กล้อง" เป็น "อนุญาต"',
      'หรือ Safari › การตั้งค่า (Settings) › แถบ "เว็บไซต์" › กล้อง › เลือกเว็บนี้เป็น "อนุญาต"',
      'ตรวจสอบ: การตั้งค่าระบบ › ความเป็นส่วนตัวและความปลอดภัย › กล้อง › เปิดให้ Safari',
      'กดปุ่ม "ลองอีกครั้ง" ด้านล่าง หรือโหลดหน้าเว็บใหม่',
    ],
  },
  ipad: {
    title: 'iPad (Safari / แอปบนหน้าโฮม)',
    steps: [
      'แตะไอคอน "ᴀA" หรือไอคอนเมนูในแถบที่อยู่ › "การตั้งค่าเว็บไซต์" › กล้อง › "อนุญาต"',
      'หรือเปิดแอป "การตั้งค่า" › Safari › กล้อง › เลือก "ถาม" หรือ "อนุญาต"',
      'ถ้าเปิดจากไอคอนบนหน้าโฮม: การตั้งค่า › Safari › กล้อง แล้วปิด-เปิดแอปใหม่',
      'ถ้าใช้ Chrome บน iPad: การตั้งค่า › Chrome › เปิด "กล้อง"',
      'ตรวจสอบ: การตั้งค่า › เวลาหน้าจอ › ข้อจำกัดเนื้อหาและความเป็นส่วนตัว › ต้องอนุญาตกล้อง',
      'กดปุ่ม "ลองอีกครั้ง" ด้านล่าง หรือโหลดหน้าเว็บใหม่',
    ],
  },
};

function currentGuide(browser: BrowserKind): GuideKey {
  if (isIPad) return 'ipad';
  if (browser === 'edge') return 'edge';
  if (browser === 'safari') return 'safari-mac';
  return 'chrome';
}

const MESSAGES: Record<CameraErrorKind, { title: string; body: string }> = {
  denied: {
    title: 'ยังไม่ได้รับอนุญาตให้ใช้กล้อง',
    body: 'Photo Booth ต้องใช้กล้องเพื่อถ่ายรูป กรุณาเปิดสิทธิ์ตามขั้นตอนด้านล่าง',
  },
  notfound: {
    title: 'ไม่พบกล้อง',
    body: 'ตรวจสอบว่าเสียบ webcam แล้ว หรืออุปกรณ์นี้มีกล้อง จากนั้นกด "ลองอีกครั้ง"',
  },
  inuse: {
    title: 'กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น',
    body: 'ปิดโปรแกรมที่อาจใช้กล้องอยู่ (เช่น Zoom, Teams, FaceTime, LINE หรือแท็บอื่น) แล้วกด "ลองอีกครั้ง"',
  },
  insecure: {
    title: 'ต้องเปิดผ่าน HTTPS',
    body: 'เบราว์เซอร์อนุญาตให้ใช้กล้องเฉพาะเว็บที่เป็น https:// หรือ localhost เท่านั้น กรุณาเปิดลิงก์ https:// ที่ได้จากคำสั่ง npm run dev',
  },
  unsupported: {
    title: 'เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง',
    body: 'กรุณาใช้ Google Chrome, Microsoft Edge หรือ Safari เวอร์ชันล่าสุด',
  },
  unknown: {
    title: 'เปิดกล้องไม่สำเร็จ',
    body: 'ลองกด "ลองอีกครั้ง" หรือโหลดหน้าเว็บใหม่ ถ้ายังไม่ได้ให้ตรวจสอบสิทธิ์กล้องตามขั้นตอนด้านล่าง',
  },
};

interface Props {
  kind: CameraErrorKind;
  onRetry: () => void;
  onBack: () => void;
}

export function PermissionHelp({ kind, onRetry, onBack }: Props) {
  const main = currentGuide(detectBrowser());
  const others = (Object.keys(GUIDES) as GuideKey[]).filter((k) => k !== main);
  const msg = MESSAGES[kind];
  const showGuides = kind === 'denied' || kind === 'unknown';

  return (
    <div className="permission-help panel scrollable">
      <div className="permission-icon" aria-hidden="true">📷</div>
      <h2>{msg.title}</h2>
      <p className="permission-body">{msg.body}</p>

      {showGuides && (
        <>
          <section className="guide guide--main">
            <h3>{GUIDES[main].title}</h3>
            <ol>
              {GUIDES[main].steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {main === 'ipad' && isStandalone() && (
              <p className="guide-note">กำลังเปิดจากไอคอนบนหน้าโฮม — หลังเปลี่ยนการตั้งค่าให้ปัดปิดแอปแล้วเปิดใหม่</p>
            )}
          </section>
          <details className="guide-others">
            <summary>วิธีเปิดสิทธิ์บนเบราว์เซอร์อื่น</summary>
            {others.map((k) => (
              <section className="guide" key={k}>
                <h3>{GUIDES[k].title}</h3>
                <ol>
                  {GUIDES[k].steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </section>
            ))}
          </details>
        </>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ย้อนกลับ
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
          โหลดหน้าใหม่
        </button>
        <button type="button" className="btn btn-gold" onClick={onRetry}>
          ลองอีกครั้ง
        </button>
      </div>
    </div>
  );
}
