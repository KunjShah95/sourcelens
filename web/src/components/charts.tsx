"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, niceMax, smoothPath } from "@/lib/utils";
import type { SeriesPoint } from "@/lib/types";

/* ------------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  color = "var(--accent)",
  height = 30,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const w = 120;
  const data = values.length ? values : [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points: [number, number][] = data.map((value, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    height - 3 - ((value - min) / span) * (height - 6),
  ]);
  const line = smoothPath(points);
  const id = `sp${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------ area chart */

type Metric = keyof Pick<SeriesPoint, "pageviews" | "visitors" | "sessions" | "ai" | "search">;

export function AreaChart({
  series,
  metric,
  secondary,
  color = "var(--accent)",
  height = 236,
}: {
  series: SeriesPoint[];
  metric: Metric;
  secondary?: Metric;
  color?: string;
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const el = container.current;
    const observer = new ResizeObserver(() => setWidth(Math.max(280, el.clientWidth)));
    observer.observe(el);
    setWidth(Math.max(280, el.clientWidth));
    return () => observer.disconnect();
  }, []);

  const pad = { l: 40, r: 12, t: 14, b: 24 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = niceMax(Math.max(...series.map((p) => p[metric] || 0), 1) * 1.15);
  const stepX = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const points: [number, number][] = series.map((point, i) => [
    pad.l + (series.length > 1 ? i * stepX : innerW / 2),
    pad.t + innerH - ((point[metric] || 0) / max) * innerH,
  ]);
  const line = smoothPath(points);
  const gradientId = `grad-${metric}`;

  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }).map((_, i) => {
    const y = pad.t + (innerH / ticks) * i;
    return (
      <g key={i}>
        <line className="grid-line" x1={pad.l} y1={y} x2={width - pad.r} y2={y} />
        <text className="axis-label" x={pad.l - 7} y={y + 3} textAnchor="end">
          {fmt.num(max - (max / ticks) * i)}
        </text>
      </g>
    );
  });

  const labelEvery = Math.max(1, Math.ceil(series.length / (width > 720 ? 8 : 5)));
  const labels = series.map((point, i) => {
    if (i % labelEvery !== 0 && i !== series.length - 1) return null;
    return (
      <text
        key={i}
        className="axis-label"
        x={points[i]?.[0] ?? pad.l}
        y={height - 6}
        textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}
      >
        {point.label}
      </text>
    );
  });

  const active = hover !== null ? points[hover] : null;
  const activePoint = hover !== null ? series[hover] : null;

  return (
    <div ref={container} className="relative w-full px-1.5 pt-1">
      <svg
        className="chart-svg block w-full"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ height }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          const index = Math.round((x - pad.l) / (stepX || 1));
          setHover(Math.max(0, Math.min(series.length - 1, index)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="55%" stopColor={color} stopOpacity="0.09" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid}
        {labels}
        <path d={`${line} L ${points.at(-1)?.[0] ?? pad.l} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active ? (
          <g>
            <line className="hover-line" x1={active[0]} y1={pad.t} x2={active[0]} y2={pad.t + innerH} />
            <circle className="hover-dot" cx={active[0]} cy={active[1]} r="4" fill={color} />
          </g>
        ) : null}
      </svg>
      {active && activePoint ? (
        <div
          className="pointer-events-none absolute z-5 -translate-x-1/2 -translate-y-full rounded-md border border-border-2 bg-panel-3 px-2.5 py-2 text-[11.5px] shadow-[var(--shadow-2)]"
          style={{
            left: `${Math.max(56, Math.min(width - 56, (active[0] / width) * width))}px`,
            top: `${(active[1] / height) * height}px`,
          }}
        >
          <div className="mb-1 text-[10.5px] text-faint">{activePoint.label}</div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: color }} />
            <b className="tabular font-mono text-[12px]">{fmt.exact(activePoint[metric])}</b>
            <span className="text-faint">{metric}</span>
          </div>
          {secondary ? (
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-faint" />
              <b className="tabular font-mono text-[12px]">{fmt.exact(activePoint[secondary])}</b>
              <span className="text-faint">{secondary}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- donut */

export function Donut({
  segments,
  total,
  label = "visits",
}: {
  segments: { value: number; color: string; label?: string }[];
  total: number;
  label?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative size-34 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--panel-3)" strokeWidth="11" />
        {segments.map((segment, i) => {
          const share = total ? segment.value / total : 0;
          const len = Math.max(0, share * c - 2.2);
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={segment.color}
              strokeWidth="11"
              strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
              strokeDashoffset={`${(-offset).toFixed(2)}`}
            />
          );
          offset += share * c;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <b className="text-[19px] leading-tight font-semibold tracking-[-0.03em] tabular">{fmt.num(total)}</b>
        <span className="text-[10px] tracking-[0.07em] text-faint uppercase">{label}</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- heatmap */

export function Heatmap({ grid }: { grid: number[][] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const safe = grid.length === 7 && grid.every((row) => row.length === 24)
    ? grid
    : Array.from({ length: 7 }, () => Array(24).fill(0));
  const max = Math.max(...safe.flat(), 1);
  return (
    <div className="grid grid-cols-[26px_repeat(24,minmax(0,1fr))] items-center gap-0.75">
      <div />
      {Array.from({ length: 24 }).map((_, h) => (
        <div key={h} className="text-center font-mono text-[8.5px] text-faint">
          {h % 6 === 0 ? h : ""}
        </div>
      ))}
      {safe.map((row, d) => (
        <div key={d} className="contents">
          <div className="pr-0.5 text-right font-mono text-[9px] text-faint">{days[d]}</div>
          {row.map((value, h) => {
            const alpha = value ? 0.14 + (value / max) * 0.86 : 0.035;
            return (
              <div
                key={h}
                title={`${days[d]} ${String(h).padStart(2, "0")}:00 — ${value} visits`}
                className="aspect-square rounded-[2.5px] transition-transform hover:z-2 hover:scale-125 hover:outline hover:outline-1 hover:outline-border-2"
                style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(alpha * 100)}%, transparent)` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
