import { describe, it, expect } from "vitest";
import { isMaintenanceDetail } from "@/lib/line-commands";

describe("isMaintenanceDetail", () => {
  it("รายละเอียดที่ขึ้นต้นด้วยคำสั่งเมนู ยังนับเป็นงานซ่อม (regression: 'ห้องน้ำรั่ว')", () => {
    expect(isMaintenanceDetail("ห้องน้ำรั่ว")).toBe(true);
    expect(isMaintenanceDetail("ห้องนอนแอร์ไม่เย็น")).toBe(true);
    expect(isMaintenanceDetail("ข้อมูลมิเตอร์ผิด")).toBe(true);
    expect(isMaintenanceDetail("บิลเดือนนี้คิดผิด")).toBe(true);
  });

  it("คำสั่งเมนูล้วนๆ ไม่นับเป็นงานซ่อม (ให้ไปทำคำสั่งเมนูแทน)", () => {
    expect(isMaintenanceDetail("ห้อง")).toBe(false);
    expect(isMaintenanceDetail("บิล")).toBe(false);
    expect(isMaintenanceDetail("พัสดุ")).toBe(false);
    expect(isMaintenanceDetail("ติดต่อ")).toBe(false);
    expect(isMaintenanceDetail("  ห้อง  ")).toBe(false); // เว้นวรรครอบข้างไม่ทำให้พลาด
  });

  it("ขึ้นต้นด้วย 'แจ้งซ่อม' = เริ่มรายการใหม่ ไม่ใช่รายละเอียด", () => {
    expect(isMaintenanceDetail("แจ้งซ่อม")).toBe(false);
    expect(isMaintenanceDetail("แจ้งซ่อม แอร์เสีย")).toBe(false);
  });

  it("ข้อความว่างไม่นับเป็นงานซ่อม", () => {
    expect(isMaintenanceDetail("")).toBe(false);
    expect(isMaintenanceDetail("   ")).toBe(false);
  });

  it("รายละเอียดทั่วไปนับเป็นงานซ่อม", () => {
    expect(isMaintenanceDetail("แอร์ไม่เย็น")).toBe(true);
    expect(isMaintenanceDetail("ก๊อกน้ำหยด")).toBe(true);
  });
});
