"use client";

/** ปิดหน้า LIFF กลับไปที่แชท (ให้ผู้เช่าไปพิมพ์เบอร์ผูกบัญชีในแชท) */
export function CloseLiffButton() {
  return (
    <button
      onClick={() => {
        try {
          (window as unknown as { liff?: { closeWindow?: () => void } }).liff?.closeWindow?.();
        } catch {
          /* ไม่มี liff (เปิดนอก LINE) — ปล่อยผ่าน */
        }
      }}
      className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white active:scale-95"
    >
      ปิดหน้านี้ ไปพิมพ์เบอร์ในแชท
    </button>
  );
}
