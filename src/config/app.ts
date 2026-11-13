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

/**
 * Long side of the final JPG (px). Frames are designed at 1024×1536, which
 * left each photo only ~370 px wide — fine on screen, soft when printed or
 * zoomed. Exporting at 2× (2048×3072, ≈ 4×6 in at 500 dpi) keeps the photos
 * at the camera's real detail. Frame art drawn larger than its file is
 * upscaled; drop in 2048×3072 frame files (same names, same JSON) for crisp
 * frame text too.
 */
export const EXPORT_LONG_SIDE = 3072;

/** JPG export quality (0–1). */
export const JPG_QUALITY = 0.93;

/**
 * GIF settings. The GIF contains only the 4 photos (no frame). Height follows
 * the photo slot's aspect ratio, i.e. the same crop as the camera preview.
 */
export const GIF_WIDTH = 600;
export const GIF_FRAME_DELAY_MS = 600;

/** Corner radius of each photo slot, in output pixels (1200x1800 space). */
export const SLOT_RADIUS = 12;

/**
 * Requested camera resolution; the browser picks the closest it supports.
 * Computers stay at 1080p (webcams, and HDMI capture cards for the Sony —
 * some cheap cards fake 4K by upscaling, which looks softer). Phones and
 * tablets ask for up to 4K so their sensors are used properly.
 */
export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;
export const MOBILE_CAMERA_IDEAL_WIDTH = 3840;
export const MOBILE_CAMERA_IDEAL_HEIGHT = 2160;

/** Captured shots are scaled to at most this height (memory on phones). The
 *  tallest slot at export size is ~2040 px, so 2160 keeps every detail. */
export const MAX_CAPTURE_HEIGHT = 2160;

/** Use the camera's full-resolution still photo (phones) instead of a video frame when available. */
export const USE_STILL_PHOTO = true;

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

/**
 * Vertical crop position when a shot is cut to a wider slot (0 = keep the
 * top, 0.5 = centre, 1 = keep the bottom). Slightly above centre keeps heads
 * in wide strip-shaped slots. The camera preview uses the same position.
 */
export const CROP_FOCAL_Y = 0.4;

/** Brighten dark shots automatically (dim office / hall lighting). Normal shots are untouched. */
export const AUTO_BRIGHTEN = true;
