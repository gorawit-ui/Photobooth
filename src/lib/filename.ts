import { FILE_PREFIX } from '../config/app';

const pad = (n: number) => String(n).padStart(2, '0');

/** magical-booth-YYYYMMDD-HHmmss (local time, no extension). */
export function makeBaseFilename(date = new Date()): string {
  const d = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const t = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${FILE_PREFIX}-${d}-${t}`;
}
