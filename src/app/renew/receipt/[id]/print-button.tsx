"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2 print:hidden">
      <Printer className="h-4 w-4" strokeWidth={2} />
      พิมพ์ / บันทึก PDF
    </button>
  );
}
