/** Global booth settings. Change values here to tune the experience. */

/** Flip the final photos horizontally so they match the mirrored preview. */
export const MIRROR_OUTPUT = true;

/** Number of shots per session. The frame slots should match this number. */
export const SHOT_COUNT = 4;

/** Countdown before the first shot (seconds). */
export const COUNTDOWN_FIRST_SECONDS = 5;

/** Countdown before shots 2, 3 and 4 (seconds). */
export const COUNTDOWN_NEXT_SECONDS = 3;

/** Pause after each shot before the next countdown starts (ms). */
export const PAUSE_BETWEEN_SHOTS_MS = 1200;

/** Return to the home screen after this much inactivity (ms). */
export const IDLE_TIMEOUT_MS = 60_000;

/** Final composed photo size (px). Same on every device. */
export const OUTPUT_WIDTH = 1200;
export const OUTPUT_HEIGHT = 1800;

/** JPG export quality (0–1). */
export const JPG_QUALITY = 0.92;

/** GIF settings. */
export const GIF_WIDTH = 600;
export const GIF_HEIGHT = 900;
export const GIF_FRAME_DELAY_MS = 600;

/** Corner radius of each photo slot, in output pixels (1200x1800 space). */
export const SLOT_RADIUS = 12;

/** Requested camera resolution. The browser picks the closest it supports. */
export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

/** Prefix for downloaded files: magical-booth-YYYYMMDD-HHmmss.jpg */
export const FILE_PREFIX = 'magical-booth';
