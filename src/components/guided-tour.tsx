"use client";

import { useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const SEEN_KEY = "chaodee_tour_v1";

// จุดไฮไลต์ในทัวร์ — ชี้เมนูข้าง (sidebar) ตามลำดับการตั้งค่า
const STEPS: DriveStep[] = [
  {
    popover: {
      title: "ยินดีต้อนรับสู่ Chao-Dee 👋",
      description: "ทัวร์สั้น ๆ พาดูว่าเริ่มตรงไหน — ตั้งค่าหอครั้งเดียว แล้วงานประจำเดือนจะเหลือแค่ จดมิเตอร์ → ออกบิล → รับชำระ",
    },
  },
  { element: '[data-tour="buildings"]', popover: { title: "1) อาคาร", description: "เริ่มที่นี่ — เพิ่มอาคาร/สาขาก่อน (ระบุชื่อ + จำนวนชั้น) เป็นฐานของทุกอย่าง", side: "right", align: "center" } },
  { element: '[data-tour="rooms"]', popover: { title: "2) ห้องพัก", description: "เพิ่มห้อง กำหนดค่าเช่า อัตราค่าน้ำ-ไฟ ค่าบริการ (ใช้ 'เพิ่มหลายห้อง' สร้างทีเดียวได้)", side: "right", align: "center" } },
  { element: '[data-tour="tenants"]', popover: { title: "3) ผู้เช่า", description: "เพิ่มผู้เช่า + เบอร์โทร — เบอร์นี้ใช้ผูกบัญชี LINE ให้ผู้เช่ารับบิล", side: "right", align: "center" } },
  { element: '[data-tour="contracts"]', popover: { title: "4) สัญญาเช่า", description: "จับคู่ห้องกับผู้เช่า ระบบจะตั้งห้องเป็น 'มีผู้เช่า' ให้อัตโนมัติ และใช้สัญญานี้ออกบิล", side: "right", align: "center" } },
  { element: '[data-tour="meters"]', popover: { title: "5) จดมิเตอร์", description: "ทุกเดือน จดเลขมิเตอร์น้ำ-ไฟ (ถ่ายรูปให้ AI อ่านได้) ระบบคำนวณหน่วย/ค่าให้", side: "right", align: "center" } },
  { element: '[data-tour="invoices"]', popover: { title: "6) บิล / ใบแจ้งหนี้", description: "กด 'ออกบิลรอบนี้' — ระบบสร้างบิลทุกห้องอัตโนมัติ แล้วส่งเข้า LINE ให้ผู้เช่า", side: "right", align: "center" } },
  { element: '[data-tour="settings"]', popover: { title: "7) ตั้งค่า", description: "ตั้งช่องทางรับเงิน (พร้อมเพย์/บัญชี) และพิมพ์ QR LINE OA ให้ผู้เช่าสแกนแอด", side: "right", align: "center" } },
  { element: '[data-tour="help"]', popover: { title: "อ่านคู่มือเต็มได้ที่นี่", description: "เมนูช่วยเหลือมีคู่มือครบทุกเมนู — เริ่มใช้งานได้เลย 🎉", side: "right", align: "center" } },
];

function runTour() {
  const d = driver({
    showProgress: true,
    progressText: "{{current}} / {{total}}",
    nextBtnText: "ถัดไป",
    prevBtnText: "ย้อนกลับ",
    doneBtnText: "เริ่มใช้งาน",
    steps: STEPS,
    onDestroyed: () => localStorage.setItem(SEEN_KEY, "done"),
  });
  d.drive();
}

/** ปุ่ม "ทัวร์แนะนำ" + เล่นอัตโนมัติครั้งแรก (เฉพาะจอใหญ่ที่มี sidebar) */
export function GuidedTour() {
  const start = useCallback(() => runTour(), []);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) === "done") return;
    // เล่นเองเฉพาะจอที่มี sidebar (≥ md) เพื่อให้ไฮไลต์ตรงเมนู
    if (window.matchMedia("(min-width: 768px)").matches) {
      const t = setTimeout(runTour, 650);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100"
    >
      <Sparkles className="h-4 w-4" strokeWidth={2.2} />
      ทัวร์แนะนำการใช้งาน
    </button>
  );
}
