"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

// LIFF SDK ผูกกับ window แบบ global — ประกาศ type แบบหลวมพอใช้งาน
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

/**
 * บูต LIFF ในทุกหน้า (วางไว้ใน layout)
 *
 * สำคัญ: ต้องเรียก liff.init() ทุกหน้าเสมอ ไม่งั้น LINE จะค้างหน้า loading
 * (progress bar หมุนไม่จบ) เพราะ LINE รอ liff.init() ก่อนแสดงเนื้อหา
 *
 * - มีเซสชันแล้ว (hasSession) → init อย่างเดียว ให้เนื้อหาที่ server render โชว์ได้เลย
 * - ยังไม่มีเซสชัน → init แล้วเอา id_token ไปแลกเซสชันที่ server + refresh
 */
export function LiffBoot({ liffId, hasSession }: { liffId: string; hasSession: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function boot() {
    const liff = window.liff;
    if (!liff || !liffId) {
      setErr("กรุณาเปิดหน้านี้ผ่านแอป LINE");
      return;
    }
    try {
      await liff.init({ liffId }); // ต้องเรียกเสมอ — ดับหน้า loading ของ LINE
      if (hasSession) return; // มีเซสชันแล้ว เนื้อหาพร้อมโชว์
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
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
      if (!res.ok) {
        setErr("ยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      router.refresh();
    } catch {
      setErr("เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  useEffect(() => {
    if (window.liff) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={boot}
      />
      {err && (
        <div className="fixed inset-x-0 top-0 z-50 bg-rose-50 px-4 py-2 text-center text-xs text-rose-600">
          {err}
        </div>
      )}
    </>
  );
}
