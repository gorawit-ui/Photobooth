#!/bin/bash
# Double-click on the booth Mac: starts the Sony Bridge (gphoto2) for the photo booth website.
# Keep this window open during the event. Close it (or Ctrl+C) to stop.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # Homebrew (Apple Silicon / Intel)

echo "=== Sony Bridge (Photo Booth) ==="
if ! command -v node >/dev/null 2>&1; then
  echo "ยังไม่มี Node.js  →  เปิด Terminal แล้วพิมพ์:  brew install node"
  read -r -p "กด Enter เพื่อปิด" _; exit 1
fi
if ! command -v gphoto2 >/dev/null 2>&1; then
  echo "ยังไม่มี gphoto2  →  เปิด Terminal แล้วพิมพ์:  brew install gphoto2"
  read -r -p "กด Enter เพื่อปิด" _; exit 1
fi

# Programs that grab the camera's USB connection before gphoto2 can.
for app in "Imaging Edge Desktop" "Remote" "Imaging Edge Webcam" "Image Capture" "Photos"; do
  if pgrep -xq "$app"; then echo "⚠️  ปิดโปรแกรม \"$app\" ก่อน (แย่ง USB กล้อง)"; fi
done
killall -9 ptpcamerad 2>/dev/null   # macOS's own camera daemon

echo "กล้องที่ gphoto2 เห็น:"
gphoto2 --auto-detect
echo
node sony-bridge.mjs "$@"
echo
read -r -p "Sony Bridge หยุดทำงานแล้ว — กด Enter เพื่อปิดหน้าต่าง" _
