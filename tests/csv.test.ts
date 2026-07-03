import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  const cols = [
    { key: "name" as const, header: "ชื่อ" },
    { key: "amount" as const, header: "ยอด" },
  ];

  it("สร้างหัวตาราง + แถว พร้อม BOM", () => {
    const csv = toCsv([{ name: "หอสุขใจ", amount: 700 }], cols);
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain("ชื่อ,ยอด");
    expect(csv).toContain("หอสุขใจ,700");
  });

  it("escape ค่าที่มี comma / quote / newline", () => {
    const csv = toCsv([{ name: 'a,"b"\nc', amount: 1 }], cols);
    expect(csv).toContain('"a,""b""\nc"');
  });

  it("ค่า null/undefined กลายเป็นช่องว่าง", () => {
    const csv = toCsv([{ name: null, amount: undefined }], cols);
    const lastLine = csv.trim().split("\n").pop();
    expect(lastLine).toBe(",");
  });
});
