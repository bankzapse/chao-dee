import { formatNumber } from "@/lib/format";

export type BarDatum = { label: string; value: number; value2?: number };

/**
 * กราฟแท่งแบบ SVG ล้วน (ไม่พึ่ง lib ภายนอก) รองรับ 1-2 ชุดข้อมูล
 */
export function BarChart({
  data,
  height = 200,
  color = "#6366f1",
  color2 = "#f43f5e",
  legend,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  color2?: string;
  legend?: [string, string];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.value, d.value2 ?? 0]));
  const hasSecond = data.some((d) => d.value2 !== undefined);
  const barTop = 24;
  const chartH = height - barTop - 28;
  const groupW = 100 / data.length;

  return (
    <div>
      {legend && (
        <div className="mb-2 flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
            {legend[0]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: color2 }} />
            {legend[1]}
          </span>
        </div>
      )}
      <svg width="100%" height={height} className="overflow-visible">
        {data.map((d, i) => {
          const x = i * groupW;
          const h1 = (d.value / max) * chartH;
          const h2 = hasSecond ? ((d.value2 ?? 0) / max) * chartH : 0;
          const bw = hasSecond ? groupW * 0.32 : groupW * 0.5;
          return (
            <g key={i}>
              <rect
                x={`${x + groupW / 2 - (hasSecond ? bw + 2 : bw / 2)}%`}
                y={barTop + chartH - h1}
                width={`${bw}%`}
                height={Math.max(0, h1)}
                rx={3}
                fill={color}
              />
              {hasSecond && (
                <rect
                  x={`${x + groupW / 2 + 2}%`}
                  y={barTop + chartH - h2}
                  width={`${bw}%`}
                  height={Math.max(0, h2)}
                  rx={3}
                  fill={color2}
                />
              )}
              <text
                x={`${x + groupW / 2}%`}
                y={barTop + chartH - h1 - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {formatNumber(Math.round(d.value))}
              </text>
              <text
                x={`${x + groupW / 2}%`}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[11px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
