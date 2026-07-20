import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh session cookie ในทุก request + กันหน้าที่ต้องล็อกอิน
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // getUser() เป็น network call — ถ้า Supabase Auth สะดุด อย่าให้ทั้งเว็บล่ม
  let user = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch {
    // auth ล่มชั่วคราว: ปล่อยหน้า public ผ่าน, หน้าที่ต้องล็อกอินให้ layout/page จัดการเอง
    return supabaseResponse;
  }

  const isAuthRoute = pathname.startsWith("/login");
  // หน้า auth ที่ถ้าล็อกอินแล้วควรเด้งกลับแดชบอร์ด
  const authedShouldLeave =
    isAuthRoute ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isPublic =
    pathname === "/" || // หน้า landing สาธารณะ
    isAuthRoute ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/owner-login") || // ทางเข้าแผงเจ้าของ (ตรวจสิทธิ์ในหน้าเอง)
    pathname.startsWith("/bill") || // หน้าบิลสาธารณะสำหรับผู้เช่า (เข้าผ่านลิงก์ใน LINE)
    pathname.startsWith("/print") || // หน้าพิมพ์ QR (เนื้อหาสาธารณะ รับค่าจาก query)
    pathname.startsWith("/property") || // marketplace เดิม (redirect ไป /rent)
    pathname.startsWith("/rent") || // Chao-Dee Rent marketplace (สาธารณะ/SEO + auth เอง)
    pathname.startsWith("/logout") || // ทางออกฉุกเฉิน — ล้าง cookie ได้เสมอ
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/dpa") ||
    pathname.startsWith("/agency-terms") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    // ไฟล์ SEO / metadata สาธารณะ
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/icon");

  // ยังไม่ล็อกอิน + เข้าหน้าที่ต้องล็อกอิน → ส่งไปหน้าเข้าระบบที่ถูกต้อง
  // (แผงเจ้าของระบบ /owner/* ใช้ทางเข้า /owner-login แยกจากแอปเจ้าของหอ)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/owner") ? "/owner-login" : "/login";
    return NextResponse.redirect(url);
  }

  // ล็อกอินแล้วแต่ยังอยู่หน้า auth → ส่งไปแดชบอร์ด
  if (user && authedShouldLeave) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
