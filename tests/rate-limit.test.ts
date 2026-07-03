import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("อนุญาตภายในลิมิต แล้วบล็อกเมื่อเกิน", () => {
    const key = "test:" + Math.floor(performance.now()) + ":a";
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("แต่ละ key แยกกัน", () => {
    const a = "test:" + Math.floor(performance.now()) + ":x";
    const b = "test:" + Math.floor(performance.now()) + ":y";
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true); // key b ยังไม่ถูกใช้
  });
});
