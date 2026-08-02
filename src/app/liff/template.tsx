// template.tsx สร้าง instance ใหม่ทุกครั้งที่เปลี่ยนหน้า (ต่างจาก layout) →
// เนื้อหา fade-in ทุกครั้งที่กดเมนู ทำให้รู้สึกลื่นเหมือนแอป
export default function LiffTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in">{children}</div>;
}
