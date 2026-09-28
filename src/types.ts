/** One raw camera shot (no frame), kept for future features such as background replacement. */
export interface Shot {
  /** Full-resolution, un-mirrored camera frame. */
  canvas: HTMLCanvasElement;
  /** Same image as a JPEG Blob. */
  blob: Blob;
  /** Object URL of `blob` (used for thumbnails). */
  url: string;
}

export interface Outputs {
  baseName: string;
  jpg: Blob;
  jpgUrl: string;
  gif: Blob;
  gifUrl: string;
}

export type Screen = 'home' | 'frames' | 'capture' | 'result' | 'download';
