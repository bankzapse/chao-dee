import { describe, it, expect } from "vitest";
import {
  allPermissionKeys,
  hasPermission,
  canAccessModule,
  fullAccess,
  PERMISSION_MODULES,
  type Access,
} from "@/lib/permissions";

// ผู้ใช้จำลองแต่ละแบบ
const owner: Access = fullAccess("owner");
const admin: Access = fullAccess("admin");
const staffInvoiceViewer: Access = {
  role: "staff",
  isOwner: false,
  permissions: ["invoices:view"],
};
const staffNoPerms: Access = { role: "staff", isOwner: false, permissions: [] };

describe("allPermissionKeys / catalog", () => {
  it("ทุก key อยู่ในรูป <module>:<action>", () => {
    for (const k of allPermissionKeys()) {
      expect(k).toMatch(/^[a-z]+:(view|create|edit|delete)$/);
    }
  });

  it("มี key ที่คาดหวัง และตรงกับจำนวนใน catalog", () => {
    const keys = allPermissionKeys();
    expect(keys).toContain("invoices:view");
    expect(keys).toContain("tenants:delete");
    const expected = PERMISSION_MODULES.reduce((n, m) => n + m.actions.length, 0);
    expect(keys.length).toBe(expected);
  });
});

describe("hasPermission — good cases (ควรอนุญาต)", () => {
  it("owner ผ่านทุก key", () => {
    expect(hasPermission(owner, "invoices:delete")).toBe(true);
    expect(hasPermission(owner, "tenants:create")).toBe(true);
  });
  it("admin ผ่านทุก key (เข้ากันได้ย้อนหลัง)", () => {
    expect(hasPermission(admin, "settings:edit")).toBe(true);
  });
  it("staff ที่ได้สิทธิ์ตรง key → ผ่าน", () => {
    expect(hasPermission(staffInvoiceViewer, "invoices:view")).toBe(true);
  });
});

describe("hasPermission — wrong cases (ควรปฏิเสธ)", () => {
  it("ยังไม่ล็อกอิน (null) → ปฏิเสธ", () => {
    expect(hasPermission(null, "invoices:view")).toBe(false);
  });
  it("staff ที่มีแค่ view → แก้ไข/ลบ ไม่ได้", () => {
    expect(hasPermission(staffInvoiceViewer, "invoices:edit")).toBe(false);
    expect(hasPermission(staffInvoiceViewer, "invoices:delete")).toBe(false);
  });
  it("staff → เข้าโมดูลอื่นที่ไม่ได้รับสิทธิ์ ไม่ได้", () => {
    expect(hasPermission(staffInvoiceViewer, "tenants:view")).toBe(false);
  });
  it("staff ไม่มีสิทธิ์เลย → ปฏิเสธทุกอย่าง", () => {
    expect(hasPermission(staffNoPerms, "invoices:view")).toBe(false);
    expect(hasPermission(staffNoPerms, "rooms:view")).toBe(false);
  });
});

describe("canAccessModule — ซ่อน/โชว์เมนู", () => {
  it("good: staff ที่มีสิทธิ์ใน invoices → เห็นเมนู invoices", () => {
    expect(canAccessModule(staffInvoiceViewer, "invoices")).toBe(true);
  });
  it("wrong: staff เดียวกัน → ไม่เห็นเมนู tenants", () => {
    expect(canAccessModule(staffInvoiceViewer, "tenants")).toBe(false);
  });
  it("owner/admin เห็นทุกโมดูล", () => {
    expect(canAccessModule(owner, "settings")).toBe(true);
    expect(canAccessModule(admin, "agency")).toBe(true);
  });
  it("null → ไม่เห็นอะไร", () => {
    expect(canAccessModule(null, "invoices")).toBe(false);
  });
});

describe("fullAccess", () => {
  it("owner → isOwner true + สิทธิ์ครบ", () => {
    expect(owner.isOwner).toBe(true);
    expect(owner.permissions.length).toBe(allPermissionKeys().length);
  });
  it("admin → isOwner false แต่สิทธิ์ครบ (backward compat)", () => {
    expect(admin.isOwner).toBe(false);
    expect(admin.permissions.length).toBe(allPermissionKeys().length);
  });
});
