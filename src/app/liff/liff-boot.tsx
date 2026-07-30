"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    liff?: {
      init: (c: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: (o?: { redirectUri?: string }) => void;
      getIDToken: () => string | null;
    };
  }
}

const SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-liff-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("โหลด SDK ไม่สำเร็จ")));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK;
    s.async = true;
    s.setAttribute("data-liff-sdk", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("โหลด SDK ไม่สำเร็จ"));
    document.head.appendChild(s);
  });
}

/**
 * บูต LIFF ทุกหน้า (วางใน layout) — ต้องเรียก liff.init() เสมอ ไม่งั้น LINE ค้าง loading
 * ชั่วคราว: โชว์ status ให้เห็นเพื่อ debug ว่าค้างขั้นไหน
 */
export function LiffBoot({ liffId, hasSession }: { liffId: string; hasSession: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState("เริ่ม");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("โหลด SDK");
        await loadSdk();
        if (cancelled) return;
        const liff = window.liff;
        if (!liff || !liffId) {
          setStatus("ไม่พบ liff/liffId (เปิดผ่าน LINE)");
          return;
        }
        setStatus("liff.init");
        await liff.init({ liffId });
        if (cancelled) return;
        if (hasSession) {
          setStatus("พร้อม ✓ (มีเซสชัน)");
          return;
        }
        if (!liff.isLoggedIn()) {
          setStatus("login redirect");
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setStatus("getIDToken");
        const idToken = liff.getIDToken();
        if (!idToken) {
          setStatus("ไม่มี idToken");
          return;
        }
        setStatus("POST /api/liff/session");
        const res = await fetch("/api/liff/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setStatus("session ไม่ผ่าน HTTP " + res.status);
          return;
        }
        setStatus("เข้าสู่ระบบ… (นำทาง)");
        window.location.replace("/liff");
      } catch (e) {
        setStatus("error: " + (e instanceof Error ? e.message : String(e)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSession, liffId, router]);

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] bg-amber-100 px-2 py-1 text-center text-[11px] font-medium text-amber-900">
      LiffBoot: {status}
    </div>
  );
}
