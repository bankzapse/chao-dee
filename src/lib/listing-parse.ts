/** แยกฟิลด์รายละเอียด (renthub-style) จาก FormData — ใช้ร่วมทั้ง 2 ฟอร์ม */
export function parseExtraFields(fd: FormData) {
  const num = (k: string) => Math.max(0, Number(fd.get(k) ?? 0));
  const wm = String(fd.get("water_mode") ?? "unit");
  const g = String(fd.get("tenant_gender") ?? "any");
  return {
    deposit: num("deposit"),
    advance_payment: num("advance_payment"),
    water_rate: num("water_rate"),
    water_mode: (wm === "person" ? "person" : "unit") as "unit" | "person",
    electric_rate: num("electric_rate"),
    common_fee: num("common_fee"),
    internet_fee: num("internet_fee"),
    size_sqm: num("size_sqm"),
    tenant_gender: (["any", "male", "female"].includes(g) ? g : "any") as "any" | "male" | "female",
    pets_allowed: fd.get("pets_allowed") === "1",
    nearby: String(fd.get("nearby") ?? "").trim(),
  };
}
