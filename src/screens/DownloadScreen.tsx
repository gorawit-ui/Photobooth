import { useMemo, useState } from 'react';
import type { Outputs } from '../types';
import { canShareFiles, downloadBlob, shareFiles } from '../lib/download';

interface Props {
  outputs: Outputs;
  onDone: () => void;
}

export function DownloadScreen({ outputs, onDone }: Props) {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const shareable = useMemo(canShareFiles, []);
  const jpgName = `${outputs.baseName}.jpg`;
  const gifName = `${outputs.baseName}.gif`;

  const mark = (key: string) => setSaved((s) => ({ ...s, [key]: true }));

  return (
    <main className="screen download-screen">
      <h2 className="screen-title">เก็บความทรงจำกลับบ้าน</h2>
      <div className="download-body">
        <img className="download-preview" src={outputs.jpgUrl} alt="" draggable={false} />
        <div className="download-actions">
          <button
            type="button"
            className="btn btn-gold btn-large"
            onClick={() => {
              downloadBlob(outputs.jpg, jpgName);
              mark('jpg');
            }}
          >
            ⬇ ดาวน์โหลด JPG {saved.jpg && '✓'}
          </button>
          <button
            type="button"
            className="btn btn-gold btn-large"
            onClick={() => {
              downloadBlob(outputs.gif, gifName);
              mark('gif');
            }}
          >
            ⬇ ดาวน์โหลด GIF {saved.gif && '✓'}
          </button>
          {shareable && (
            <button
              type="button"
              className="btn btn-ghost btn-large"
              onClick={async () => {
                const ok = await shareFiles([
                  { blob: outputs.jpg, filename: jpgName },
                  { blob: outputs.gif, filename: gifName },
                ]);
                if (ok) mark('share');
              }}
            >
              🖼 บันทึกลงรูปภาพ / แชร์ {saved.share && '✓'}
            </button>
          )}
          <p className="hint">
            {shareable
              ? 'บน iPad ไฟล์ที่ดาวน์โหลดจะอยู่ในแอป "ไฟล์" › ดาวน์โหลด หรือกด "บันทึกลงรูปภาพ"'
              : 'ไฟล์จะถูกบันทึกในโฟลเดอร์ดาวน์โหลดของเครื่อง'}
          </p>
          <button type="button" className="btn btn-ghost btn-large btn-done" onClick={onDone}>
            เสร็จสิ้น · กลับหน้าแรก
          </button>
        </div>
      </div>
    </main>
  );
}
