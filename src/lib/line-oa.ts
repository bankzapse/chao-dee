/** normalize @id ให้ขึ้นต้นด้วย @ + คืนลิงก์แอดเพื่อน LINE OA (pure — ใช้ได้ทั้ง server/client) */
export function lineOaUrl(id: string): string {
  const clean = id.trim();
  if (!clean) return "";
  const withAt = clean.startsWith("@") ? clean : `@${clean}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(withAt)}`;
}

/** LINE OA กลางของ Chao-Dee — ผู้เช่าทุกหอสแกนแอดตัวนี้ตัวเดียว (override ได้ด้วย env) */
export const CHAO_DEE_OA_ID = (process.env.NEXT_PUBLIC_LINE_OA_ID || "@epe8275f").trim();
export const chaoDeeOaUrl = (): string => lineOaUrl(CHAO_DEE_OA_ID);
