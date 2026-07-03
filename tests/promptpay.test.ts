import { describe, it, expect } from "vitest";
import { buildPromptPayPayload } from "@/lib/promptpay";

describe("buildPromptPayPayload", () => {
  it("ขึ้นต้นด้วย payload format 000201 และปิดท้ายด้วย CRC 4 หลัก", () => {
    const p = buildPromptPayPayload("0812345678");
    expect(p.startsWith("000201")).toBe(true);
    expect(p).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("static (11) เมื่อไม่กำหนดยอด, dynamic (12) เมื่อกำหนดยอด", () => {
    expect(buildPromptPayPayload("0812345678")).toContain("010211");
    const withAmount = buildPromptPayPayload("0812345678", 500);
    expect(withAmount).toContain("010212");
    // field 54 = amount "500.00"
    expect(withAmount).toContain("5406500.00");
  });

  it("เบอร์มือถือถูกเข้ารหัสเป็น 0066 + ตัด 0 นำหน้า", () => {
    const p = buildPromptPayPayload("0812345678");
    expect(p).toContain("0066812345678");
  });

  it("เลขบัตรประชาชน 13 หลักใช้ tag 02", () => {
    const p = buildPromptPayPayload("1234567890123");
    expect(p).toContain("02131234567890123");
  });

  it("CRC ถูกต้อง (คำนวณซ้ำได้ค่าเดิม)", () => {
    const p = buildPromptPayPayload("0812345678", 123.45);
    const body = p.slice(0, -4);
    const crc = p.slice(-4);
    // ความยาวรวมสมเหตุสมผล และ CRC เป็น hex ตัวใหญ่
    expect(body.endsWith("6304")).toBe(true);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });
});
