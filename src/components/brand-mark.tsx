/**
 * โลโก้ Chao-Dee — โมโนแกรม "CD" ในกล่องไล่เฉดม่วง→ฟ้า
 * พร้อมเส้นหลังคาบ้านเล็กๆ สื่อถึงอสังหา/หอพัก
 * ใช้ SVG ล้วน คมทุกขนาด · ปรับขนาดผ่าน prop `size`
 */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = "cd"; // gradient id (คงที่ได้ เพราะเฉดเดียวทั้งแอป)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Chao-Dee"
      role="img"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}-bg)`} />
      {/* หลังคาบ้าน */}
      <path d="M20 21 L32 13 L44 21" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* โมโนแกรม CD */}
      <text
        x="32"
        y="47"
        fontFamily="'Segoe UI', system-ui, Arial, sans-serif"
        fontSize="26"
        fontWeight="800"
        letterSpacing="-1.5"
        fill="#ffffff"
        textAnchor="middle"
      >
        CD
      </text>
    </svg>
  );
}
