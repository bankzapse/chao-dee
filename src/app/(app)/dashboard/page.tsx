import { redirect } from "next/navigation";

// แดชบอร์ดถูกรวมเข้ากับหน้ารายงานแล้ว — ทุกลิงก์เดิม/ล็อกอิน ให้ไปที่ /reports
export default function DashboardPage() {
  redirect("/reports");
}
