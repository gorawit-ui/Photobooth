import { frameSize, type FrameConfig } from '../config/frames';

interface Props {
  frame: FrameConfig;
  /** Slot being shot now (highlighted), or -1. */
  current: number;
  /** Number of shots already taken (filled in). */
  taken: number;
  className?: string;
}

/** Tiny diagram of the frame layout so guests see which photo comes next. */
export function LayoutMap({ frame, current, taken, className }: Props) {
  const { width, height } = frameSize(frame);
  return (
    <svg
      className={className ? `layout-map ${className}` : 'layout-map'}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={current >= 0 ? `ช่องที่ ${current + 1} จาก ${frame.slots.length}` : 'ตำแหน่งรูปในกรอบ'}
    >
      <rect className="layout-map-sheet" x="0" y="0" width={width} height={height} rx={width * 0.04} />
      {frame.slots.map((s, i) => {
        const cls = i === current ? 'is-current' : i < taken ? 'is-taken' : '';
        return (
          <g key={i} className={`layout-map-slot ${cls}`}>
            <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={width * 0.012} />
            <text x={s.x + s.width / 2} y={s.y + s.height / 2} dominantBaseline="central" textAnchor="middle" fontSize={width * 0.11}>
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
