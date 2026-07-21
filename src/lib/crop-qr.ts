import jsQR from "jsqr";

/** ขนาดสูงสุดที่ใช้ "ตรวจหา" QR — รูปใหญ่กว่านี้ย่อก่อนเพื่อไม่ให้ค้าง (ตัดจากรูปต้นฉบับเสมอ) */
const DETECT_MAX = 1400;
/** เผื่อขอบรอบ QR (สัดส่วนของด้าน) — QR ต้องมี quiet zone ไม่งั้นบางแอปสแกนไม่ติด */
const PADDING_RATIO = 0.1;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านรูปไม่สำเร็จ"));
    };
    img.src = url;
  });
}

function draw(img: HTMLImageElement, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการตัดรูป");
  return { canvas, ctx };
}

/**
 * ตัดเอาเฉพาะส่วน QR ออกจากรูป (เช่น สกรีนช็อตจากแอปธนาคารที่มี UI อื่นติดมาด้วย)
 *
 * ใช้ jsQR หาตำแหน่งมุมทั้ง 4 ของ QR → ครอบเป็นสี่เหลี่ยมจัตุรัส + เว้นขอบขาว
 * (quiet zone ที่มาตรฐาน QR ต้องมี ไม่งั้นแอปธนาคารบางเจ้าสแกนไม่ติด)
 *
 * คืน null ถ้าหา QR ในรูปไม่เจอ → ให้ผู้เรียกใช้รูปเดิมแทน
 */
export async function cropQrFromImage(file: File): Promise<File | null> {
  const img = await loadImage(file);
  const { width, height } = img;
  if (!width || !height) return null;

  // ย่อก่อนตรวจหา เพื่อความเร็ว แล้วค่อยแปลงพิกัดกลับไปที่รูปต้นฉบับ
  const scale = Math.min(1, DETECT_MAX / Math.max(width, height));
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);

  const det = draw(img, dw, dh);
  det.ctx.drawImage(img, 0, 0, dw, dh);
  const found = jsQR(det.ctx.getImageData(0, 0, dw, dh).data, dw, dh);
  if (!found) return null;

  const corners = [
    found.location.topLeftCorner,
    found.location.topRightCorner,
    found.location.bottomLeftCorner,
    found.location.bottomRightCorner,
  ];
  const xs = corners.map((c) => c.x / scale);
  const ys = corners.map((c) => c.y / scale);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // ครอบเป็นจัตุรัสรอบจุดกึ่งกลาง (QR เป็นจัตุรัส แต่มุมที่ตรวจได้อาจเบี้ยวเล็กน้อย)
  const side = Math.max(maxX - minX, maxY - minY);
  const pad = side * PADDING_RATIO;
  const out = Math.round(side + pad * 2);
  if (out < 40) return null; // เล็กเกินไป น่าจะตรวจผิด

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const sx = cx - out / 2;
  const sy = cy - out / 2;

  const res = draw(img, out, out);
  // พื้นขาว เผื่อ QR อยู่ชิดขอบรูปจนครอบออกไปนอกภาพ (ไม่ให้เหลือพื้นที่โปร่งใส)
  res.ctx.fillStyle = "#ffffff";
  res.ctx.fillRect(0, 0, out, out);
  res.ctx.drawImage(img, sx, sy, out, out, 0, 0, out, out);

  const blob = await new Promise<Blob | null>((r) => res.canvas.toBlob(r, "image/png"));
  if (!blob) return null;
  return new File([blob], "qr.png", { type: "image/png" });
}
