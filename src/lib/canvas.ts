export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export function get2d(canvas: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings) {
  const ctx = canvas.getContext('2d', opts);
  if (!ctx) throw new Error('2D canvas not available');
  return ctx;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality,
    );
  });
}

/** Free a canvas' backing store early (Safari on iPad has a tight canvas memory cap). */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
