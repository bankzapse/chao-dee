import "server-only";

const FROM = process.env.EMAIL_FROM || "Chao-Dee <noreply@chao-dee.com>";

/** ตั้งค่าอีเมลแล้วหรือยัง (มี RESEND_API_KEY) — ถ้าไม่มี ระบบจะข้ามการส่งอีเมลแบบเงียบ */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * ส่งอีเมล transactional ผ่าน Resend HTTP API (ไม่พึ่ง SDK)
 * best-effort: คืน { ok:false } ถ้ายังไม่ตั้งค่า/ส่งไม่สำเร็จ โดยไม่ throw
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) return { ok: false, error: "email not configured" };
  if (!opts.to || !opts.to.includes("@")) return { ok: false, error: "invalid recipient" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) return { ok: false, error: await res.text().catch(() => `${res.status}`) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** เทมเพลตอีเมลแบบเรียบ (กล่องข้อความ + ปุ่ม) */
export function emailShell(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-weight:700;font-size:18px;color:#4f46e5">Chao-Dee</div>
    <h1 style="font-size:20px;margin:16px 0 8px">${title}</h1>
    <div style="font-size:14px;line-height:1.7;color:#334155">${bodyHtml}</div>
    ${
      cta
        ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600">${cta.label}</a>`
        : ""
    }
    <p style="margin-top:24px;font-size:12px;color:#94a3b8">อีเมลนี้ส่งจากระบบ Chao-Dee · chao-dee.com</p>
  </div>`;
}
