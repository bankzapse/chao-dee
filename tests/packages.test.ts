import { describe, it, expect } from "vitest";
import { PACKAGES, packageBySlug } from "@/lib/packages";

describe("packages", () => {
  it("มี 3 แพ็คเกจ: plus, pro, exclusive", () => {
    expect(PACKAGES.map((p) => p.slug)).toEqual(["plus", "pro", "exclusive"]);
  });

  it("packageBySlug คืนแพ็คเกจถูกต้อง / undefined เมื่อไม่พบ", () => {
    expect(packageBySlug("pro")?.name).toBe("Pro");
    expect(packageBySlug("ไม่มี")).toBeUndefined();
  });

  it("เพดาน (caps) ตั้งค่าครบ: plus จำกัด, exclusive ไม่จำกัด", () => {
    expect(packageBySlug("plus")?.caps).toEqual({ buildings: 4, rooms: 100, tenants: 100 });
    expect(packageBySlug("pro")?.caps).toEqual({ buildings: 10, rooms: 300, tenants: 300 });
    expect(packageBySlug("exclusive")?.caps).toEqual({ buildings: null, rooms: null, tenants: null });
  });

  it("Pro เป็นแพ็คเกจที่ highlight", () => {
    expect(packageBySlug("pro")?.highlight).toBe(true);
  });
});
