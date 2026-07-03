import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, sweepIfNeeded } from "@/lib/rate-limit";

export const runtime = "nodejs";

const READING_SCHEMA = {
  type: "object",
  properties: {
    value: {
      type: "number",
      description: "ตัวเลขที่อ่านได้จากหน้าปัดมิเตอร์ (เฉพาะเลขจำนวนเต็มของหน่วยที่ใช้)",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "ความมั่นใจในการอ่าน",
    },
    note: { type: "string", description: "หมายเหตุสั้นๆ ถ้าอ่านไม่ชัด" },
  },
  required: ["value", "confidence", "note"],
  additionalProperties: false,
} as const;

export async function POST(req: Request) {
  // ต้องล็อกอินก่อน — กันการยิง Claude จากภายนอก
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  // จำกัดความถี่ต่อผู้ใช้ (20 ครั้ง/นาที)
  sweepIfNeeded();
  const rl = rateLimit(`read-meter:${user.id}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `เรียกถี่เกินไป ลองใหม่ใน ${rl.retryAfter} วินาที` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน .env.local" },
      { status: 400 }
    );
  }

  const { imageBase64, mediaType, previous, meterType } = await req.json();
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const label = meterType === "electric" ? "มิเตอร์ไฟฟ้า" : "มิเตอร์น้ำ";
  const prevText =
    typeof previous === "number"
      ? `ค่ามิเตอร์รอบก่อนหน้าคือ ${previous} (ค่าปัจจุบันควรมากกว่าหรือเท่ากับค่านี้)`
      : "";

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: READING_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `นี่คือรูปถ่าย${label} กรุณาอ่านตัวเลขหน่วยที่แสดงบนหน้าปัด แล้วส่งกลับเป็นตัวเลข. ${prevText} หากตัวเลขบางหลักไม่ชัดเจนให้ประมาณค่าที่ดีที่สุดและตั้ง confidence เป็น low.`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const parsed = JSON.parse(raw) as {
      value: number;
      confidence: string;
      note: string;
    };

    // ตรวจความผิดปกติเทียบกับรอบก่อน
    let anomaly: string | null = null;
    if (typeof previous === "number") {
      const diff = parsed.value - previous;
      if (diff < 0) anomaly = "ค่าที่อ่านได้น้อยกว่ารอบก่อน — โปรดตรวจสอบ";
      else if (previous > 0 && diff > previous * 2 && diff > 100)
        anomaly = "การใช้งานสูงผิดปกติ — โปรดตรวจสอบ";
    }

    return NextResponse.json({ ...parsed, anomaly });
  } catch (e) {
    Sentry.captureException(e);
    if (e instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `เรียก AI ไม่สำเร็จ (${e.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "อ่านค่ามิเตอร์ไม่สำเร็จ" }, { status: 500 });
  }
}
