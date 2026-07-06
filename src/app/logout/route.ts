import { NextResponse } from "next/server";

/**
 * ออกจากระบบแบบ GET — ล้าง auth cookie แล้วเด้งไปหน้าเข้าสู่ระบบ
 * ใช้เป็นทางออกฉุกเฉินได้เสมอ (เช่น จากหน้า error) ไม่พึ่ง server action
 */
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  const cookieHeader = request.headers.get("cookie") ?? "";
  cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-"))
    .forEach((name) => res.cookies.set(name, "", { maxAge: 0, path: "/" }));
  return res;
}
