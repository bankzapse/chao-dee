import { NextResponse } from "next/server";
import { getProvinces, getAmphoes, getTambons } from "@/lib/thai-geo";

export const runtime = "nodejs";

/** ข้อมูลที่อยู่แบบ cascading — /api/geo?province=&amphoe= */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const province = url.searchParams.get("province") ?? "";
  const amphoe = url.searchParams.get("amphoe") ?? "";

  let options: string[];
  if (province && amphoe) options = getTambons(province, amphoe);
  else if (province) options = getAmphoes(province);
  else options = getProvinces();

  return NextResponse.json({ options });
}
