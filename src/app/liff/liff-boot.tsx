"use client";

import { useEffect, useState } from "react";

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
 * บูต LIFF ทุกหน้า (วางใน layout)
 *
 * ต้องเรียก liff.init() เสมอ ไม่งั้น LINE ค้างหน้า loading
 * - มีเซสชันแล้ว → init อย่างเดียว ให้เนื้อหาที่ server render โชว์ได้เลย
 * - ยังไม่มีเซสชัน → init + แลก id_token เป็นเซสชัน + โหลดหน้าใหม่ให้ server เห็น cookie
 */
export function LiffBoot({ liffId, hasSession }: { liffId: string; hasSession: boolean }) {
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSdk();
        if (cancelled) return;
        const liff = window.liff;
        if (!liff || !liffId) {
          setErr("กรุณาเปิดหน้านี้ผ่านแอป LINE");
          return;
        }
        await liff.init({ liffId }); // ต้องเรียกเสมอ — ดับหน้า loading ของ LINE
        if (cancelled) return;
        if (hasSession) {
          // เซสชันใช้ได้แล้ว — ล้าง flag กัน loop
          try { sessionStorage.removeItem("liff_x"); } catch {}
          return;
        }
        // กัน loop: ถ้าเพิ่งแลก session ไปแล้วรอบก่อน แต่ server ยังมองว่า "ไม่มี session"
        // = เบราว์เซอร์ (LINE webview) ไม่ยอมเก็บคุกกี้ → หยุดวน แล้วบอกทางผูกผ่านแชทแทน
        let exchanged = false;
        try { exchanged = sessionStorage.getItem("liff_x") === "1"; } catch {}
        if (exchanged) {
          try { sessionStorage.removeItem("liff_x"); } catch {}
          setErr("เปิดผ่าน LINE ไม่สำเร็จ (เบราว์เซอร์บล็อกคุกกี้) — พิมพ์ “เบอร์โทรของคุณ” ในแชทเพื่อผูกบัญชีได้เลย");
          return;
        }
        if (!liff.isLoggedIn()) {
          // ใช้ redirectUri "สะอาด" (ตัด query เช่น ?liff.state=... ที่ LINE ใส่มา)
          // ไม่งั้น LINE มักตอบ 400 Bad Request ตอน login (โดยเฉพาะหลังเปลี่ยนสถานะบัญชี/ค้าง cache)
          liff.login({ redirectUri: window.location.origin + window.location.pathname });
          return;
        }
        const idToken = liff.getIDToken();
        if (!idToken) {
          setErr("อ่านข้อมูลบัญชี LINE ไม่ได้ ลองเปิดใหม่อีกครั้ง");
          return;
        }
        const res = await fetch("/api/liff/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setErr("ยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่");
          return;
        }
        // ไปหน้าตามสถานะจริง: ผูกแล้ว → เมนู, ยังไม่ผูก → หน้ากรอกเบอร์
        // (กันเด้ง /liff ↔ /liff/link วนเป็น loop เมื่อยังไม่ผูก)
        const data = (await res.json().catch(() => ({ linked: false }))) as { linked?: boolean };
        // ทำเครื่องหมายว่าแลก session แล้ว — ถ้ารอบหน้ายัง "ไม่มี session" = คุกกี้ไม่ติด (กัน loop ด้านบน)
        try { sessionStorage.setItem("liff_x", "1"); } catch {}
        window.location.replace(data.linked ? "/liff" : "/liff/link");
      } catch {
        if (!cancelled) setErr("เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasSession, liffId]);

  if (!err) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-rose-50 px-4 py-2 text-center text-xs text-rose-600">
      {err}
    </div>
  );
}
