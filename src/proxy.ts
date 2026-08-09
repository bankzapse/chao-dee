import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: convention เปลี่ยนจาก middleware → proxy (ไฟล์ src/proxy.ts + ฟังก์ชันชื่อ proxy)
// ตรรกะเดิม: refresh session ของ Supabase ทุก request ที่ไม่ใช่ static/image
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * จับทุก path ยกเว้น static files และ image optimization
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
