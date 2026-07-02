"use client";

import { useState } from "react";

/**
 * ปุ่มที่กดแล้วเปิด Modal พร้อม children เป็นเนื้อหาในกล่อง
 * ส่ง render prop `close` ให้ปิดกล่องหลังบันทึกสำเร็จ
 */
export function ModalButton({
  label,
  title,
  variant = "primary",
  children,
}: {
  label: string;
  title: string;
  variant?: "primary" | "secondary";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={variant === "primary" ? "btn-primary" : "btn-secondary"}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="card my-8 w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <button
                onClick={close}
                className="text-slate-400 hover:text-slate-600"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>
            {children(close)}
          </div>
        </div>
      )}
    </>
  );
}
