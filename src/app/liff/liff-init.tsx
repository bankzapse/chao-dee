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
 * เริ่มต้น LIFF: init → login (ถ้ายัง) → เอา id_token ไปแลกเซสชันที่ server
 * เสร็จแล้ว refresh ให้หน้า server component อ่าน cookie เห็นผู้เช่า
 *
 * นอก LINE (ไม่มี liffId / เปิดในเบราว์เซอร์ปกติ) จะโชว์ข้อความให้เปิดผ่าน LINE
 */
export function LiffInit({ liffId }: { liffId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [msg, setMsg] = useState("กำลังเชื่อมต่อ LINE…");

  async function boot() {
    const liff = window.liff;
    if (!liff || !liffId) {
      setStatus("error");
      setMsg("กรุณาเปิดหน้านี้ผ่านแอป LINE");
      return;
    }
    try {
      await liff.init({ liffId });
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }
      const idToken = liff.getIDToken();
      if (!idToken) {
        setStatus("error");
        setMsg("อ่านข้อมูลบัญชี LINE ไม่ได้ ลองเปิดใหม่อีกครั้ง");
        return;
      }
      const res = await fetch("/api/liff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        setStatus("error");
        setMsg("ยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setStatus("ok");
      router.refresh();
    } catch {
      setStatus("error");
      setMsg("เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  useEffect(() => {
    // เผื่อ SDK โหลดเสร็จก่อน component mount
    if (window.liff) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "ok") return null;

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={boot}
      />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        {status === "loading" ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        ) : (
          <div className="text-3xl">📱</div>
        )}
        <p className="text-sm text-slate-500">{msg}</p>
      </div>
    </>
  );
}
