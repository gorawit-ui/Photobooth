import { isIOS } from './device';

/**
 * Save a Blob as a file. Works in Chrome, Edge and Safari (macOS + iPadOS 13+):
 * uses an <a download> link on a blob: URL, which Safari turns into its
 * download prompt / Files download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari needs the URL alive for a moment after click.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Whether the Web Share API can share files (iPad Safari: "Save Image"). */
export function canShareFiles(): boolean {
  if (!isIOS || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/jpeg' })], 'probe.jpg', {
      type: 'image/jpeg',
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Open the share sheet so the photo can be saved to the Photos app.
 * Must be called directly from a tap handler.
 * Returns false when sharing is unavailable or failed (not when cancelled).
 */
export async function shareFiles(files: { blob: Blob; filename: string }[]): Promise<boolean> {
  const list = files.map((f) => new File([f.blob], f.filename, { type: f.blob.type }));
  try {
    if (!navigator.canShare?.({ files: list })) return false;
    await navigator.share({ files: list });
    return true;
  } catch (err) {
    // AbortError = the user closed the share sheet; that's fine.
    return err instanceof DOMException && err.name === 'AbortError';
  }
}
