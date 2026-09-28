export function MagicLoader({ text = 'กำลังร่ายเวทมนตร์...' }: { text?: string }) {
  return (
    <div className="magic-loader" role="status" aria-live="polite">
      <div className="magic-orb">
        <span />
        <span />
        <span />
      </div>
      <p>{text}</p>
    </div>
  );
}
