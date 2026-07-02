/**
 * สร้าง payload สำหรับ PromptPay QR (มาตรฐาน EMVCo / Thai QR Payment)
 * รองรับเบอร์มือถือ (10 หลัก), เลขบัตรประชาชน/เลขผู้เสียภาษี (13 หลัก), e-Wallet (15 หลัก)
 */

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTarget(promptpayId: string): string {
  const digits = promptpayId.replace(/\D/g, "");
  // e-Wallet (15 หลัก)
  if (digits.length === 15) return tlv("03", digits);
  // เลขบัตรประชาชน / เลขผู้เสียภาษี (13 หลัก)
  if (digits.length === 13) return tlv("02", digits);
  // เบอร์มือถือ → 0066 + ตัดเลข 0 นำหน้า
  const mobile = "0066" + digits.replace(/^0/, "");
  return tlv("01", mobile);
}

/**
 * @param promptpayId เบอร์โทร / เลขบัตรประชาชน / e-Wallet id
 * @param amount จำนวนเงิน (บาท) — ถ้าไม่ระบุจะเป็น QR แบบไม่กำหนดยอด
 * @returns สตริง payload พร้อมนำไปเข้ารหัสเป็นภาพ QR
 */
export function buildPromptPayPayload(promptpayId: string, amount?: number): string {
  const hasAmount = typeof amount === "number" && amount > 0;

  const merchantAccount = tlv(
    "29",
    tlv("00", "A000000677010111") + formatTarget(promptpayId)
  );

  let payload =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") + // 11 = static, 12 = dynamic (มียอด)
    merchantAccount +
    tlv("53", "764") + // สกุลเงิน THB
    (hasAmount ? tlv("54", amount!.toFixed(2)) : "") +
    tlv("58", "TH");

  payload += "6304"; // header ของ CRC
  return payload + crc16(payload);
}
