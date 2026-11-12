# ธีม "The Order of Unity · ภาคีแห่งความสามัคคี"

ธีมใหม่สำหรับงาน **TDFB Outing** แนวโรงเรียนเวทมนตร์ยามค่ำคืน ใช้โปสเตอร์ PR ของงานเป็นแนวอ้างอิงเรื่องสี แสง และบรรยากาศ **ไม่ใช้รูปคน**จากโปสเตอร์

- ม็อกดีไซน์ (Claude Design canvas): https://claude.ai/artifact/N8ukbh7RKkYgn1LRRGz4x4
  ลิงก์เป็นแบบส่วนตัว เจ้าของต้องแชร์จากเมนู Share ก่อน คนอื่นจึงจะเปิดได้
- ไฟล์ต้นฉบับของม็อกเก็บไว้ใน [`canvas/`](./canvas) (รูปแบบ `.dc.html` ของ Claude Design) เพื่อให้แก้ต่อหรือใช้อ้างอิงตอนลงโค้ดได้

> **สถานะ:** เป็นแบบร่างสำหรับเลือกทิศทาง ยังไม่ได้นำไปใช้ในแอป แอปตอนนี้ยังใช้ธีม Magical Night (น้ำเงิน-ทอง) เดิม

---

## ⚠️ ลิขสิทธิ์
ห้ามใช้ชื่อหรือสัญลักษณ์ที่เป็นเครื่องหมายการค้าของภาพยนตร์หรือหนังสือ เช่น **"Hogwarts"**, Harry Potter, ตราบ้าน, "Platform 9¾", Hogwarts Express หรือแผลรูปสายฟ้า บนกรอบรูปและหน้าจอบูธ เพราะรูปจะถูกแชร์ออกสู่สาธารณะ

ให้ใช้ชื่องานของ TDFB เองคือ **"TDFB OUTING · The Order of Unity · ภาคีแห่งความสามัคคี"** คู่กับองค์ประกอบเวทมนตร์ทั่วไปที่ไม่มีเจ้าของ เช่น ปราสาท เทียนลอย รถไฟไอน้ำ นกฮูก จดหมาย ตราครั่ง และประกายทอง

---

## ระบบดีไซน์

| Token | ค่า | ใช้ตรงไหน |
| --- | --- | --- |
| Midnight navy | `#0B1433` | พื้นหลังหลัก |
| Antique gold | `#D4A64A` (ไล่ `#FFF1C4 → #E3B54C → #9A6A1E`) | ปุ่ม หัวเรื่อง กรอบ |
| Crimson | `#7A1E2B` | สีเน้น (มาจากรถไฟ) |
| Parchment | `#F2E6C9` / `#FAF1D8 → #EBDAB0` | การ์ด แผง ตั๋ว |
| Candle glow | `#FFE7A8 → #FFB24A` | แสงเทียน แสงตะเกียง |

| ตัวอักษร | ใช้ทำอะไร |
| --- | --- |
| Cinzel Decorative 700 | หัวเรื่องอังกฤษ "The Order of Unity" |
| Cinzel 700 (letter-spacing กว้าง) | ป้ายเล็ก เช่น "TDFB OUTING", "ADMIT ONE" |
| Chonburi | หัวเรื่องและปุ่มภาษาไทย |
| Mitr 300–500 | เนื้อหาทั่วไป |

องค์ประกอบหลัก: กรอบทองบาโรก (มีเม็ดลูกปัด ลายใบไม้ม้วนที่มุม และตราประดับ) · เทียนลอยพร้อมแสงเรือง · หน้าต่างกระจกสีโกธิก · หน้าต่างตู้รถไฟ · ตั๋วรถไฟ · จดหมายนกฮูก · ตราครั่ง

---

## หน้าจอบนม็อก (1366×768)

| ไฟล์ | หน้า | จุดเด่น |
| --- | --- | --- |
| `Main.dc.html` | หน้าแรก | ท้องฟ้าดาว ปราสาท เส้นประกาย ปุ่มเริ่มถ่ายรูปทำเป็น**ตั๋วรถไฟ** |
| `FrameSelect.dc.html` | เลือกกรอบ | การ์ดกรอบทอง ดึงตัวอย่างจากไฟล์กรอบจริง |
| `Capture.dc.html` | ถ่ายรูป | พรีวิวในกรอบทอง ตัวเลขนับถอยหลังสีทอง และ "โจทย์ท่าโพส" |
| `Result.dc.html` | ผลลัพธ์ | แผงกระดาษเลือกฉากเวทมนตร์ / ฉากจริง และฟิลเตอร์ |

## กรอบพิมพ์บนม็อก (1024×1536 = 4×6 นิ้ว)

ช่องรูปใช้ตำแหน่งเดียวกับ `public/frames/templates.json`:

| ช่อง | x | y | กว้าง | สูง |
| --- | --- | --- | --- | --- |
| 1 บนซ้าย | 84 | 94 | 372 | 454 |
| 2 บนขวา | 568 | 94 | 372 | 454 |
| 3 ล่างซ้าย | 84 | 663 | 372 | 454 |
| 4 ล่างขวา | 568 | 663 | 372 | 454 |

| ไฟล์ | แบบ | สถานะ |
| --- | --- | --- |
| `FrameGreatHall.dc.html` | **The Great Hall:** เทียนลอย ห้องโถงโกธิก กรอบทองบาโรก แผ่นจารึกชื่องาน | ปรับรอบ 2 แล้ว |
| `FrameNightExpress.dc.html` | **The Night Express:** ตู้รถไฟสีแดง หน้าต่างโค้ง ตะเกียงทองเหลือง ชานชาลา ตั๋ว | ปรับรอบ 2 แล้ว |
| `FrameOwlPost.dc.html` | **The Owl Post:** กระดาษจดหมาย ลายหมึกกับทอง ตราครั่ง นกฮูก (พิมพ์ประหยัดหมึก) | รอบแรก |

กฎของกรอบ: ลายทุกอย่างต้องอยู่**นอกช่องรูป** เพราะแอปวาดรูปถ่ายทับช่องรูปทีหลัง และมี Tweak "ช่องรูปตัวอย่าง" ปิดแล้วจะได้แม่แบบเปล่าไว้ส่งออกเป็น PNG

**ข้อสังเกตจากเจ้าของงาน:** กรอบรอบแรกดู "เรียบและแข็งเกินไป" รอบ 2 จึงเพิ่มแสงเทียน มิติลึก หมอก และลวดลายหลายชั้นตามภาพอ้างอิงห้องโถงเทียนลอย ภาพอ้างอิงนั้นใช้ดูอารมณ์เท่านั้น ไม่ได้นำมาใส่ในโปรเจกต์

---

## Prompt สำหรับให้ ChatGPT ออกแบบ (แนบโปสเตอร์ PR เป็นแนวอ้างอิง)

### 1) กรอบรูปสำหรับพิมพ์
```text
Design a printable photobooth frame template, using the attached event poster ONLY as a style and mood reference (colors, lighting, magical night atmosphere, ornate gold details). Do NOT copy any people, faces or photos from the reference.

CANVAS
- Portrait, exactly 1024 × 1536 px (2:3 ratio, prints at 4 × 6 inches).

FOUR PHOTO WINDOWS (critical — keep these exact positions and sizes)
- Window 1 (top-left):     x 84,  y 94,  width 372, height 454
- Window 2 (top-right):    x 568, y 94,  width 372, height 454
- Window 3 (bottom-left):  x 84,  y 663, width 372, height 454
- Window 4 (bottom-right): x 568, y 663, width 372, height 454
- Each window must be a perfectly straight, axis-aligned rectangle filled with ONE flat solid color (pure white #FFFFFF). No texture, gradient, glow, sparkles, text or decoration inside the windows — real photos will be placed on top of them later.
- All decoration must stay OUTSIDE the windows: ornate frames around each window, corner flourishes, borders, background art in the margins and in the gaps between windows.

BOTTOM TITLE AREA (y ≈ 1150 to 1536)
- An illustrated scene plus a title plaque with this exact text, spelled correctly:
  "TDFB OUTING"
  "The Order of Unity"
  "ภาคีแห่งความสามัคคี" (Thai — render it exactly, or leave a clean empty plaque if you cannot render Thai perfectly)

STYLE
- Theme: an original magical wizarding school at night — enchanted great hall with hundreds of floating candles, warm amber candlelight, gothic arches, stained-glass windows, gold baroque frames, crimson steam train, owls, sealed letters, sparkle trails, starry deep-blue sky.
- Palette: midnight navy #0B1433, antique gold #D4A64A, crimson #7A1E2B, parchment #F2E6C9.
- Rich, layered, painterly and luxurious, with depth and glow. Not flat and not minimal.
- Print-friendly: crisp edges, nothing important within 30 px of the outer edge.

DO NOT INCLUDE
- Any people or faces.
- Any trademarked names, logos or symbols from existing films or books (no "Hogwarts", no house crests, no "9¾", no lightning-bolt scar, no studio logos).
- Watermarks, signatures, or extra text other than the title above.

Make 3 different variations:
A) "The Great Hall" — floating candles, gothic hall, gold baroque frames
B) "The Night Express" — crimson train carriage, windows as photo frames, steam, brass lamps, a train ticket title plaque
C) "The Owl Post" — light parchment letter, ink and gold filigree, wax seal, owl carrying a letter (lighter, ink-saving for printing)
```

### 2) ภาพฉากหลังสำหรับ "ฉากเวทมนตร์"
```text
Create a vertical 2:3 background image (1024 × 1536 px) for a photobooth background-replacement effect, using the attached poster only as a style reference.

Scene: an original magical great hall at night, seen from eye level. Hundreds of floating candles with warm glow, gothic stone arches, a tall glowing stained-glass window in the distance, long wooden tables fading into perspective, soft mist on the floor, golden sparkle trails, an enchanted starry night-sky ceiling.

Composition: keep the center and lower half calm and uncluttered, because people will be cut out and placed standing in front of it. Put the most beautiful details at the top and along the left and right edges.

No people, no text, no letters, no logos, no trademarked symbols (no "Hogwarts", no house crests). Painterly, cinematic, rich warm lighting.
```

### 3) ม็อกหน้าจอบูธ (ถ้าต้องการ)
```text
Design a 1366 × 768 landscape kiosk screen for a self-service photobooth web app, in the same style as the attached poster (midnight navy, antique gold, crimson, parchment; original magical wizarding-school theme with floating candles and gold baroque details).

Show the home screen: the title "The Order of Unity" and "ภาคีแห่งความสามัคคี", a large start button shaped like a vintage train ticket reading "เริ่มถ่ายรูป", and small sound and fullscreen icon buttons in the top-right corner. Large, touch-friendly buttons; text must be readable from 1–2 m away.

No people, no trademarked names or logos.
```

### ส่งไฟล์ที่ได้จาก ChatGPT
- อัปโหลด**ไฟล์ต้นฉบับ** (PNG/JPG) ไว้ในโฟลเดอร์ Google Drive แล้วส่งลิงก์ให้ Claude ดึงไปใช้
- ตั้งชื่อตามนี้: `frame-great-hall.png`, `frame-night-express.png`, `frame-owl-post.png`, `scene-great-hall.png`
- สิ่งที่จะทำต่อหลังได้ไฟล์:
  - วางกรอบใน `public/frames/` และฉากใน `public/backgrounds/`
  - วัดตำแหน่งช่องรูปจริงแล้วตั้งค่าใน `templates.json` (ตำแหน่งในภาพ AI มักคลาดไปเล็กน้อย)
  - ถ้าภาษาไทยในภาพเพี้ยน จะใส่ตัวหนังสือไทยทับด้วยโค้ด
