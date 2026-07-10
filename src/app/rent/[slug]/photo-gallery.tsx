"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const total = photos.length;

  const go = useCallback(
    (d: number) => setIdx((i) => (i + d + total) % total),
    [total]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go]);

  if (total === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl bg-slate-100 text-6xl text-slate-300 sm:h-96">
        🏢
      </div>
    );
  }

  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-xl font-bold text-slate-700 shadow hover:bg-white";

  return (
    <div>
      {/* รูปหลัก */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={photos[idx]}
          alt={`รูปที่ ${idx + 1}`}
          onClick={() => setOpen(true)}
          className="h-72 w-full cursor-zoom-in object-cover sm:h-96"
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          🖼 {idx + 1}/{total}
        </span>
        {total > 1 && (
          <>
            <button type="button" aria-label="ก่อนหน้า" onClick={() => go(-1)} className={`${arrowBtn} left-2`}>
              ‹
            </button>
            <button type="button" aria-label="ถัดไป" onClick={() => go(1)} className={`${arrowBtn} right-2`}>
              ›
            </button>
          </>
        )}
      </div>

      {/* thumbnails */}
      {total > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`รูปย่อ ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-16 w-24 shrink-0 cursor-pointer rounded-lg object-cover ring-2 transition ${
                i === idx ? "ring-indigo-500" : "ring-transparent hover:ring-slate-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* lightbox เต็มจอ */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-4 text-white">
            <span className="text-sm font-medium">
              {idx + 1} / {total}
            </span>
            <button type="button" aria-label="ปิด" onClick={() => setOpen(false)} className="text-3xl leading-none hover:text-slate-300">
              ✕
            </button>
          </div>

          {total > 1 && (
            <button
              type="button"
              aria-label="ก่อนหน้า"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 sm:left-6"
            >
              ‹
            </button>
          )}

          <img
            src={photos[idx]}
            alt={`รูปที่ ${idx + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-[92vw] object-contain"
          />

          {total > 1 && (
            <button
              type="button"
              aria-label="ถัดไป"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 sm:right-6"
            >
              ›
            </button>
          )}

          {total > 1 && (
            <div
              className="absolute bottom-4 flex max-w-[92vw] gap-2 overflow-x-auto px-2"
              onClick={(e) => e.stopPropagation()}
            >
              {photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`รูปย่อ ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={`h-12 w-16 shrink-0 cursor-pointer rounded object-cover transition ${
                    i === idx ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
