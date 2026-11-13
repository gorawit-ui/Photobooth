# Sony Bridge (gphoto2) สำหรับ Mac

ให้เว็บ Photobooth **กดชัตเตอร์จริงของ Sony a7C ผ่านสาย USB** แล้วใช้ไฟล์ JPEG เต็มความละเอียดของกล้อง (6000×4000) แทนภาพจากวิดีโอ
- ใช้ **gphoto2** (โปรแกรมคุมกล้องแบบ open source) ทำงานบน **Mac** (และ Linux)
- รูปต้นฉบับทุกรูปเก็บไว้ที่ `~/Pictures/PhotoBooth-Sony`

ถ้า Bridge ไม่ได้เปิด หรือดึงรูปไม่สำเร็จ เว็บจะใช้กล้องปกติแทนเองโดยไม่หยุด

```
[a7C] ──USB──▶ [Sony Bridge + gphoto2 บน Mac] ◀──▶ [เว็บ Photobooth ใน Chrome บน Mac เครื่องเดียวกัน]
```

> **ใช้ได้ทีละอย่าง:** โหมด PC Remote (Bridge) กับโหมด USB Streaming (เว็บแคม) ใช้สาย USB เส้นเดียวกัน จึงใช้พร้อมกันไม่ได้
> ตอนใช้ Bridge ภาพสดสำหรับจัดท่าจะมาจาก Bridge เอง (เลือกกล้อง **"Sony · ภาพสดจากโปรแกรมตัวกลาง"** ในเว็บ)

---

## 1. ติดตั้งครั้งเดียว (บน Mac)
เปิดแอป **Terminal** แล้วพิมพ์
```bash
# Homebrew (ถ้ายังไม่มี)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install gphoto2 node
```
เช็กว่า gphoto2 เวอร์ชันนี้รู้จัก a7C:
```bash
gphoto2 --list-cameras | grep -i "7C"
```
ควรเห็นบรรทัดที่มี **ILCE-7C** หรือ **Alpha-A7C** ถ้าไม่มี ให้อัปเดตด้วย `brew upgrade gphoto2 libgphoto2`

จากนั้นเอาโค้ดโปรเจกต์ลงเครื่อง (`git clone` หรือดาวน์โหลด ZIP ของ branch นี้)

## 2. ตั้งกล้อง a7C (โหมด PC Remote)
1. **ปิดกล้องและถอดสาย USB**
2. หมุน dial ไป**โหมดภาพนิ่ง** (P หรือ A) ห้ามใช้โหมดวิดีโอ และอย่ากด USB Streaming
3. ตั้งค่า **PC Remote** ให้เหมือนตอนที่ **Imaging Edge Desktop → Remote** เชื่อมกล้องได้
4. ตั้งค่าคุณภาพไฟล์:
   - File Format / Quality: **JPEG** (หรือ RAW+JPEG) ถ้าเป็น RAW อย่างเดียวเว็บจะไม่ได้รูป
   - Still Img. Save Dest. (ใน PC Remote Function ถ้ามี): **PC Only** หรือ **PC+Camera**
5. ปิด Auto Power Off และใช้แบตเต็มหรือแบตดัมมี่เสียบไฟ
6. เปิดกล้อง แล้วเสียบ USB เข้า Mac

**วิธีเช็กว่าตั้งถูก:** ถ้า Imaging Edge Desktop (Remote) บน Mac เห็นกล้องและกดถ่ายได้ แปลว่าโหมดกล้องถูกแล้ว จากนั้น**ปิด Imaging Edge ให้หมด**ก่อนใช้ gphoto2 เพราะใช้ USB แย่งกัน

## 3. ทดสอบ gphoto2 ตรง ๆ (ครั้งแรก)
```bash
killall -9 ptpcamerad 2>/dev/null       # macOS แย่งกล้องไว้ ต้องปิดก่อน
gphoto2 --auto-detect                    # ต้องเห็น Sony ...
gphoto2 --capture-image-and-download     # กล้องต้องลั่นชัตเตอร์ และได้ไฟล์ .jpg ในโฟลเดอร์ปัจจุบัน
```
| ข้อความที่เจอ | แก้ |
|---|---|
| `Could not claim the USB device` | ปิด Imaging Edge / Photos / Image Capture แล้วรัน `killall -9 ptpcamerad` อีกครั้ง |
| `--auto-detect` ไม่เห็นกล้อง | เช็กว่ากล้องอยู่โหมด PC Remote (ข้อ 2) เปลี่ยนสายหรือพอร์ต แล้วถอดเสียบใหม่ |
| ถ่ายได้แต่ได้ไฟล์ `.arw` อย่างเดียว | ตั้งกล้องเป็น JPEG หรือ RAW+JPEG |

## 4. เปิด Bridge
- **ดับเบิลคลิก** ไฟล์ `tether/Start Sony Bridge.command`
  - ครั้งแรกถ้า macOS ไม่ยอมเปิด ให้คลิกขวา → **Open** → **Open**
  - หรือใช้ Terminal: `node tether/sony-bridge.mjs`
- หน้าต่างต้องขึ้น `Sony Bridge v1 · backend gphoto2` และ `พบกล้อง: Sony ...`
- **เปิดหน้าต่างนี้ทิ้งไว้ตลอดงาน**

## 5. เปิดใช้ในเว็บ (Chrome บน Mac เครื่องเดียวกัน)
1. เปิด `https://photobooth-tdfb.vercel.app` → เลือกกรอบ → หน้าถ่ายรูป
2. กดปุ่ม **(i)** → ติ๊ก **ใช้ Sony Bridge** → ถ้า Chrome ถามเรื่องเครือข่ายในพื้นที่ (local network) ให้กด **Allow**
3. ในช่องกล้อง เลือก **"Sony · ภาพสดจากโปรแกรมตัวกลาง"** เป็นภาพสดสำหรับจัดท่า
4. ในแผงขวาต้องเห็นกล่องสถานะ**สีเขียว** "ถ่ายด้วยชัตเตอร์กล้องจริง (gphoto2)"
5. กดถ่าย: นับถอยหลัง → **"ค้างท่าไว้…"** ระหว่างกล้องถ่ายและส่งไฟล์ (ประมาณ 1–3 วินาที) → แฟลช

เว็บจำการตั้งค่าไว้ในเครื่องนั้น ครั้งต่อไปแค่เปิด Bridge แล้วเปิดเว็บก็ใช้ได้เลย

## ลำดับวันงาน
1. เปิดกล้อง (dial ที่ P หรือ A) → เสียบ USB
2. ดับเบิลคลิก `Start Sony Bridge.command` → ต้องเห็น "พบกล้อง"
3. เปิด Chrome → เว็บ → ทดสอบถ่าย 1 รอบ
4. ห้ามเปิด Imaging Edge ระหว่างงาน

---

## ทดสอบหน้าเว็บโดยไม่มีกล้อง (เครื่องไหนก็ได้ รวม Windows)
```bash
node tether/sony-bridge.mjs --backend mock
```
รูปที่ได้จะเป็นภาพทดสอบ "MOCK SONY" ใช้เช็กว่าเว็บคุยกับ Bridge ได้

## ตัวเลือก
```bash
node tether/sony-bridge.mjs --help
node tether/sony-bridge.mjs --dir ~/Desktop/booth-photos              # ที่เก็บต้นฉบับ
node tether/sony-bridge.mjs --allow-origin https://xxx.vercel.app     # อนุญาตเว็บ preview อื่น
```
- Bridge รับคำสั่งเฉพาะจากเครื่องตัวเอง (127.0.0.1)
- รับเฉพาะจากเว็บ `photobooth-tdfb.vercel.app` และ localhost เว็บอื่นได้ 403
- ถ้าบน Mac ไม่พบ gphoto2 โปรแกรมจะหยุดพร้อมบอกวิธีติดตั้ง **ไม่สลับไปใช้ภาพปลอมเอง**

## API
| คำสั่ง | ผล |
|---|---|
| `GET /status` | `{ ok, version, backend, camera, ready, busy, liveview }` |
| `POST /capture` | ถ่าย → `{ ok, id, url, bytes, ms }` |
| `GET /photos/<file>.jpg` | ไฟล์รูปเต็ม |
| `GET /liveview` | MJPEG (`multipart/x-mixed-replace`) จาก `gphoto2 --capture-movie` |

ฝั่งเว็บ: `src/lib/tether.ts`, `src/hooks/useTether.ts`

## สถานะการทดสอบ
- **ทดสอบแล้ว:** เว็บกับ Bridge แบบกล้องจำลอง ครบทั้งสถานะ ภาพสด ชัตเตอร์ รับไฟล์ และกลับไปใช้กล้องปกติเมื่อ Bridge ใช้ไม่ได้
- **ยังไม่ได้ทดสอบกับ a7C จริง:** ต้องผ่านข้อ 3 บน Mac ก่อน
