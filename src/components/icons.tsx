/**
 * Line icons for UI controls: 20px box, 1.75 stroke, round caps, currentColor.
 * One set so every control looks the same weight (no emoji in UI chrome).
 */
import type { SVGProps } from 'react';

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export const SoundOnIcon = () => (
  <Icon>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </Icon>
);

export const SoundOffIcon = () => (
  <Icon>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Icon>
);

/** Sparkle = ambient motion running. */
export const MotionOnIcon = () => (
  <Icon>
    <path d="M12 3.5c.5 3.6 1.9 5 5.5 5.5-3.6.5-5 1.9-5.5 5.5-.5-3.6-1.9-5-5.5-5.5 3.6-.5 5-1.9 5.5-5.5Z" />
    <path d="M18.5 14.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5Z" />
  </Icon>
);

/** Sparkle with a slash = motion paused. */
export const MotionOffIcon = () => (
  <Icon>
    <path d="M12 3.5c.5 3.6 1.9 5 5.5 5.5-3.6.5-5 1.9-5.5 5.5-.5-3.6-1.9-5-5.5-5.5 3.6-.5 5-1.9 5.5-5.5Z" />
    <path d="M4 20 20 4" />
  </Icon>
);

export const ExpandIcon = () => (
  <Icon>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Icon>
);

export const CollapseIcon = () => (
  <Icon>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </Icon>
);

export const ArrowRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon strokeWidth="2" {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const CameraIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const DownloadIcon = () => (
  <Icon>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icon>
);

export const PrinterIcon = () => (
  <Icon>
    <path d="M7 9V4h10v5M7 17H4v-8h16v8h-3" />
    <path d="M7 14h10v6H7z" />
  </Icon>
);

export const ShareIcon = () => (
  <Icon>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M6 11H5v9h14v-9h-1" />
  </Icon>
);

export const CheckIcon = () => (
  <Icon strokeWidth="2.25">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const ImageIcon = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m4 17 5-4 4 3 3-2 4 3" />
  </Icon>
);

export const SparkleIcon = MotionOnIcon;

export const FlipIcon = () => (
  <Icon>
    <path d="M12 3v18" strokeDasharray="2 2.5" />
    <path d="M9 7 4 17h5zM15 7l5 10h-5z" />
  </Icon>
);

export const ChevronLeftIcon = () => (
  <Icon>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const InfoIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" strokeWidth="2.2" />
  </Icon>
);

export const ZoomIcon = () => (
  <Icon>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.8-4.8M10.5 7.5v6M7.5 10.5h6" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Icon>
);

export const TorchIcon = () => (
  <Icon>
    <path d="M8 3h8l-1 6h-6zM9 9h6l-1 12h-4z" />
    <path d="M12 13v3" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
