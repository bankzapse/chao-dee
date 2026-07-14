/** normalize @id ให้ขึ้นต้นด้วย @ + คืนลิงก์แอดเพื่อน LINE OA (pure — ใช้ได้ทั้ง server/client) */
export function lineOaUrl(id: string): string {
  const clean = id.trim();
  if (!clean) return "";
  const withAt = clean.startsWith("@") ? clean : `@${clean}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(withAt)}`;
}
