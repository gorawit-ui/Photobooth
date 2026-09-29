/** Global booth settings. Change values here to tune the experience. */

/** Flip the final photos horizontally like the mirrored preview. false = true-to-life (text reads correctly). */
export const MIRROR_OUTPUT = false;

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

/**
 * GIF settings. The GIF contains only the 4 photos (no frame). Height follows
 * the photo slot's aspect ratio, i.e. the same crop as the camera preview.
 */
export const GIF_WIDTH = 600;
export const GIF_FRAME_DELAY_MS = 600;

/** Corner radius of each photo slot, in output pixels (1200x1800 space). */
export const SLOT_RADIUS = 12;

/** Requested camera resolution. The browser picks the closest it supports. */
export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

/** Prefix for downloaded files: magical-booth-YYYYMMDD-HHmmss.jpg */
export const FILE_PREFIX = 'magical-booth';

/**
 * Person-segmentation model for the magic background (in /public/models).
 * The multiclass model (hair / skin / clothes / background) cuts hair and
 * white clothing against a white wall much more cleanly than the small
 * selfie model, at ~16 MB and ~0.4 s per photo.
 */
export const SEGMENTATION_MODEL = '/models/selfie_multiclass_256x256.tflite';

/**
 * Magic background: people are cut out and placed on this scene (JPG only;
 * the GIF keeps the real room). Guests can switch back on the result screen.
 */
export const MAGIC_SCENE_IMAGE = '/backgrounds/magic-castle.jpg';
export const MAGIC_SCENE_DEFAULT_ON = true;
/** Shots where less than this share of pixels is a person keep the real background. */
export const MIN_PERSON_COVERAGE = 0.02;
