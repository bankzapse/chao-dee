/** ส่วนต่าง ๆ ของแผงเจ้าของระบบที่กำหนดสิทธิ์ให้แอดมินได้ (client-safe) */
export const ADMIN_SECTIONS = [
  { key: "members", label: "สมาชิก", icon: "👥", href: "/owner/members" },
  { key: "payments", label: "การชำระเงิน", icon: "💳", href: "/owner/payments" },
  { key: "promotions", label: "โปรโมทประกาศ", icon: "⭐", href: "/owner/listings" },
  { key: "agency", label: "ดีลนายหน้า", icon: "🤝", href: "/owner/agency" },
  { key: "packages", label: "แพ็คเกจ", icon: "📦", href: "/owner/packages" },
  { key: "promos", label: "คูปองส่วนลด", icon: "🎟️", href: "/owner/promos" },
  { key: "reports", label: "รายงาน", icon: "📊", href: "/owner/reports" },
  { key: "audit", label: "บันทึกกิจกรรม", icon: "📝", href: "/owner/audit" },
] as const;
