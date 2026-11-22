import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const nf = new Intl.NumberFormat("en-US");

export const fmt = {
  num(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
    if (value >= 1e4) return `${Math.round(value / 1e3)}k`;
    return nf.format(Math.round(value));
  },
  exact(value: number | null | undefined): string {
    return nf.format(Math.round(value || 0));
  },
  pct(value: number | null | undefined, digits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    const factor = 10 ** digits;
    return `${Math.round(value * factor) / factor}`.replace(/\.0+$/, "").replace(/^(\d+)$/, "$1") + "%";
  },
  dur(seconds: number | null | undefined): string {
    if (!seconds) return "0s";
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rest = s % 60;
    if (m < 60) return `${m}m${rest ? ` ${rest}s` : ""}`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  },
  ago(ts: number | null | undefined): string {
    if (!ts) return "—";
    const diff = Math.max(0, Date.now() - ts);
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return `${Math.floor(diff / 86_400_000)}d`;
  },
  dateTime(ts: number): string {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  },
};

export const CHANNEL_LABEL: Record<string, string> = {
  search: "Organic search",
  ai: "AI assistants",
  social: "Social",
  referral: "Referral",
  paid: "Paid",
  email: "Email",
  direct: "Direct",
  internal: "Internal",
};

export const CHANNEL_VAR: Record<string, string> = {
  search: "var(--channel-search)",
  ai: "var(--channel-ai)",
  social: "var(--channel-social)",
  referral: "var(--channel-referral)",
  paid: "var(--channel-paid)",
  email: "var(--channel-email)",
  direct: "var(--channel-direct)",
  internal: "var(--channel-internal)",
};

export function channelColor(channel?: string, fallback?: string): string {
  return (channel && CHANNEL_VAR[channel]) || fallback || "var(--accent)";
}

export function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function niceMax(value: number): number {
  const exp = Math.floor(Math.log10(value || 1));
  const base = 10 ** exp;
  const norm = value / base;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * base;
}
