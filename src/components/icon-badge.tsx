import type { LucideIcon } from "lucide-react";

/**
 * IconBadge — ไอคอน SVG ในกรอบไล่สี + เงานุ่ม ("picture shadow")
 * ใช้แทน emoji ทั่วทั้งแอปเพื่อลุคพรีเมียมและสม่ำเสมอ
 */
export type IconTone =
  | "indigo"
  | "violet"
  | "emerald"
  | "amber"
  | "sky"
  | "rose"
  | "cyan"
  | "slate";

const TONE: Record<IconTone, { bg: string; ring: string; icon: string; shadow: string }> = {
  indigo: { bg: "from-indigo-50 to-indigo-100", ring: "ring-indigo-100", icon: "text-indigo-600", shadow: "shadow-indigo-200/60" },
  violet: { bg: "from-violet-50 to-violet-100", ring: "ring-violet-100", icon: "text-violet-600", shadow: "shadow-violet-200/60" },
  emerald: { bg: "from-emerald-50 to-emerald-100", ring: "ring-emerald-100", icon: "text-emerald-600", shadow: "shadow-emerald-200/60" },
  amber: { bg: "from-amber-50 to-amber-100", ring: "ring-amber-100", icon: "text-amber-600", shadow: "shadow-amber-200/60" },
  sky: { bg: "from-sky-50 to-sky-100", ring: "ring-sky-100", icon: "text-sky-600", shadow: "shadow-sky-200/60" },
  rose: { bg: "from-rose-50 to-rose-100", ring: "ring-rose-100", icon: "text-rose-600", shadow: "shadow-rose-200/60" },
  cyan: { bg: "from-cyan-50 to-cyan-100", ring: "ring-cyan-100", icon: "text-cyan-600", shadow: "shadow-cyan-200/60" },
  slate: { bg: "from-slate-50 to-slate-100", ring: "ring-slate-200", icon: "text-slate-600", shadow: "shadow-slate-200/60" },
};

const SIZE = {
  sm: { box: "h-8 w-8 rounded-lg", icon: 16 },
  md: { box: "h-11 w-11 rounded-xl", icon: 20 },
  lg: { box: "h-14 w-14 rounded-2xl", icon: 26 },
  xl: { box: "h-16 w-16 rounded-2xl", icon: 30 },
} as const;

export function IconBadge({
  icon: Icon,
  tone = "indigo",
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = TONE[tone];
  const s = SIZE[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br ${t.bg} ${s.box} shadow-lg ${t.shadow} ring-1 ${t.ring} ${className}`}
    >
      <Icon size={s.icon} strokeWidth={2} className={t.icon} />
    </span>
  );
}
