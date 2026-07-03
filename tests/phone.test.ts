import { describe, it, expect } from "vitest";
import { toE164, toE164Digits, toLocalThai } from "@/lib/phone";

describe("toE164", () => {
  it("แปลงเบอร์ 0 นำหน้า 10 หลัก", () => {
    expect(toE164("0812345678")).toBe("+66812345678");
    expect(toE164("089-261-6445")).toBe("+66892616445");
  });
  it("รับรูปแบบ 66 และ +66", () => {
    expect(toE164("66812345678")).toBe("+66812345678");
    expect(toE164("+66812345678")).toBe("+66812345678");
  });
  it("คืน null เมื่อไม่ถูกต้อง", () => {
    expect(toE164("08123")).toBeNull();
    expect(toE164("1234567890")).toBeNull();
    expect(toE164("")).toBeNull();
  });
});

describe("toE164Digits", () => {
  it("เหมือน toE164 แต่ไม่มี +", () => {
    expect(toE164Digits("0812345678")).toBe("66812345678");
    expect(toE164Digits("+66812345678")).toBe("66812345678");
    expect(toE164Digits("bad")).toBeNull();
  });
});

describe("toLocalThai", () => {
  it("66 → 0", () => {
    expect(toLocalThai("66812345678")).toBe("0812345678");
  });
  it("คงรูป 0 เดิม", () => {
    expect(toLocalThai("0812345678")).toBe("0812345678");
  });
});
