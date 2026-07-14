import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";

async function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(p).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

/**
 * Health check สำหรับ uptime monitor (UptimeRobot / BetterUptime ฯลฯ)
 * 200 = ปกติ, 503 = subsystem หลักมีปัญหา
 * GET → รายละเอียด JSON, HEAD → เช็ค status code เบา ๆ
 */
async function check() {
  const started = Date.now();
  const admin = createAdminClient();

  const dbRes = await withTimeout(
    admin.from("platform_settings").select("id", { count: "exact", head: true }).limit(1),
    4000
  );
  const db = Boolean(dbRes && !(dbRes as { error?: unknown }).error);

  const storageRes = await withTimeout(admin.storage.listBuckets(), 4000);
  const storage = Boolean(storageRes && !(storageRes as { error?: unknown }).error);

  const ok = db; // storage เป็นข้อมูลเสริม ไม่ทำให้ทั้งระบบ down
  return {
    ok,
    body: {
      status: ok ? "ok" : "degraded",
      version: VERSION,
      checks: { db, storage },
      ms: Date.now() - started,
    },
  };
}

export async function GET() {
  const { ok, body } = await check();
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}

export async function HEAD() {
  const { ok } = await check();
  return new Response(null, { status: ok ? 200 : 503 });
}
