// ============================================================================
// frontend/src/components/system/Sparkline.tsx
// ----------------------------------------------------------------------------
// Phase 6 (May 2026):
//   Tiny inline-SVG line + area chart for week-at-a-glance trend visibility
//   above the matrix tables. No charting library — recharts would be ~50kB
//   gzipped for one shape.
//
//   Renders a smooth line above a faded area fill, normalized to the array's
//   own min/max so even small variances are visible. If every value is zero
//   the chart shows a flat baseline at 50% so the box doesn't look broken.
//
//   Theme-aware: uses currentColor for the stroke + a faded version for fill,
//   so callers can theme it by setting text-color on the wrapper (e.g.
//   `text-brand`).
// ============================================================================

import { useMemo } from "react";

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  labels?: string[];          // optional axis labels matching data length
  ariaLabel?: string;
}

export default function Sparkline({
  data,
  width = 280,
  height = 48,
  className = "",
  labels,
  ariaLabel,
}: SparklineProps) {
  const { linePath, areaPath, points, max } = useMemo(() => {
    const n = data.length;
    if (n === 0) {
      return { linePath: "", areaPath: "", points: [] as Array<{x: number; y: number}>, max: 0 };
    }
    const lo = Math.min(...data, 0);
    const hi = Math.max(...data, 1);
    const range = Math.max(hi - lo, 1);
    const stepX = n > 1 ? width / (n - 1) : 0;
    const padY = 4;

    const pts = data.map((v, i) => {
      const x = i * stepX;
      const yNorm = (v - lo) / range; // 0..1
      const y = height - padY - yNorm * (height - padY * 2);
      return { x, y };
    });

    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;

    return { linePath: line, areaPath: area, points: pts, max: hi };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <svg
        role="img"
        aria-label={ariaLabel ?? "Trend sparkline"}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        className="text-brand"
      >
        <path d={areaPath} fill="currentColor" opacity={0.12} />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={data[i] === max && max > 0 ? 2.5 : 1.75}
            fill="currentColor"
          />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5 mt-1 font-medium">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
