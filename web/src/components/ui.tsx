"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, CircleAlert, Copy, X } from "lucide-react";
import { cn, fmt } from "@/lib/utils";
import type { AuditCheck, Channel } from "@/lib/types";

/* ---------------------------------------------------------------- button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md";
};

export function Button({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-panel text-[12.5px] font-medium text-ink transition-[background,border-color,transform] duration-150 hover:border-border-2 hover:bg-panel-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3",
        variant === "primary" &&
          "border-transparent bg-primary font-semibold text-primary-ink hover:border-transparent hover:bg-[color-mix(in_srgb,var(--primary)_88%,var(--ink))]",
        variant === "ghost" && "border-transparent bg-transparent text-muted hover:bg-panel-2 hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ card */

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 rounded-[14px] border border-border bg-panel shadow-[var(--shadow-1)]", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  hint,
  icon,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-border px-4 py-3">
      <h3 className="flex items-center gap-2 text-[12.5px] font-semibold tracking-[-0.005em]">
        {icon ? <span className="text-faint [&>svg]:size-3.5 [&>svg]:stroke-[1.8]">{icon}</span> : null}
        {title}
      </h3>
      {action ?? (hint ? <span className="text-[11.5px] text-faint">{hint}</span> : null)}
    </div>
  );
}

/* ----------------------------------------------------------------- badge */

const CHANNEL_STYLE: Record<Channel, string> = {
  search: "text-ch-search border-[color-mix(in_srgb,var(--channel-search)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-search)_9%,transparent)]",
  ai: "text-ch-ai border-[color-mix(in_srgb,var(--channel-ai)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-ai)_9%,transparent)]",
  social: "text-ch-social border-[color-mix(in_srgb,var(--channel-social)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-social)_9%,transparent)]",
  referral: "text-ch-referral border-[color-mix(in_srgb,var(--channel-referral)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-referral)_9%,transparent)]",
  paid: "text-ch-paid border-[color-mix(in_srgb,var(--channel-paid)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-paid)_9%,transparent)]",
  email: "text-ch-email border-[color-mix(in_srgb,var(--channel-email)_26%,transparent)] bg-[color-mix(in_srgb,var(--channel-email)_9%,transparent)]",
  direct: "text-muted",
  internal: "text-faint",
};

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border bg-panel-2 px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export function ChannelBadge({ channel, label }: { channel?: string; label?: string }) {
  const key = (channel || "direct") as Channel;
  return (
    <Badge className={CHANNEL_STYLE[key] || CHANNEL_STYLE.direct}>
      {label || ({ search: "Organic search", ai: "AI assistants", social: "Social", referral: "Referral", paid: "Paid", email: "Email", direct: "Direct", internal: "Internal" } as Record<string, string>)[key] || key}
    </Badge>
  );
}

/* ------------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex h-8 items-center gap-px rounded-md border border-border bg-panel p-0.5", size === "sm" && "h-[27px]")}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-full rounded px-2.5 text-[12px] font-normal whitespace-nowrap text-faint transition-colors hover:text-muted",
            value === option.value &&
              "bg-panel-3 font-medium text-ink shadow-[inset_0_0_0_1px_var(--border-2)]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- delta */

export function Delta({ value, invert }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null) {
    return <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] text-faint">new</span>;
  }
  if (value === undefined || value === 0) {
    return <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[11px] text-faint">0%</span>;
  }
  const good = invert ? value < 0 : value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-medium",
        good ? "bg-[color-mix(in_srgb,var(--ok)_12%,transparent)] text-ok" : "bg-[color-mix(in_srgb,var(--bad)_12%,transparent)] text-bad"
      )}
    >
      {value > 0 ? <ArrowUp className="size-2.5 stroke-[2.4]" /> : <ArrowDown className="size-2.5 stroke-[2.4]" />}
      {Math.abs(value).toFixed(1).replace(/\.0$/, "")}%
    </span>
  );
}

/* --------------------------------------------------------------- skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-2 h-3 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[14px]" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
        <Skeleton className="h-84 rounded-[14px]" />
        <Skeleton className="h-84 rounded-[14px]" />
      </div>
    </div>
  );
}

export function EmptyState({ title, sub, icon }: { title: string; sub?: string; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 px-4 py-9 text-center text-[12.5px] text-faint">
      {icon || <span className="size-5 rounded border border-border-2" />}
      <b className="font-medium text-muted">{title}</b>
      {sub ? <span className="max-w-72">{sub}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ table */

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, num }: { children?: ReactNode; num?: boolean }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-2 whitespace-nowrap border-b border-border bg-panel px-3.5 py-2.5 text-[10.5px] font-medium tracking-[0.06em] text-faint uppercase",
        num && "text-right"
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, num, strong }: { children?: ReactNode; num?: boolean; strong?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] px-3.5 py-2.5 align-middle text-muted last:border-0",
        num && "tabular text-right font-mono text-[11.5px] text-ink",
        strong && "font-medium text-ink"
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------- bars */

export function BarList({
  rows,
  color,
}: {
  rows: { key: string; pageviews: number; channel?: string; label?: string }[];
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.pageviews), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
            <span className="truncate text-ink" title={row.key}>{row.label || row.key}</span>
            {row.channel ? <ChannelBadge channel={row.channel} /> : null}
            <span className="ml-auto tabular shrink-0 font-mono text-[11.5px] text-muted">{fmt.num(row.pageviews)}</span>
          </div>
          <div className="h-0.75 col-span-2 overflow-hidden rounded-full bg-panel-3">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(2, (row.pageviews / max) * 100)}%`,
                background: color || "var(--accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- ring */

export function ScoreRing({ score, label, sub, color }: { score: number; label: string; sub: string; color?: string }) {
  const r = 21;
  const c = 2 * Math.PI * r;
  const tint = color || (score >= 80 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--bad)");
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-panel-2 p-3">
      <div className="relative size-13 shrink-0">
        <svg viewBox="0 0 52 52" className="size-full -rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--panel-3)" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke={tint}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
          />
        </svg>
        <b className="absolute inset-0 grid place-content-center font-mono text-[13px] font-medium tabular">{score}</b>
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-medium">{label}</div>
        <div className="mt-0.5 text-[10.5px] text-faint">{sub}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-80 grid place-items-center p-5">
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[3px]" onClick={onClose} />
      <div className="animate-pop relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[14px] border border-border-2 bg-panel shadow-[var(--shadow-2)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h3 className="text-sm font-semibold tracking-[-0.01em]">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-panel-2 hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ field */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-8.5 w-full rounded-md border border-border-2 bg-bg-soft px-2.5 text-[13px] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]";

/* ------------------------------------------------------------- code block */

export function CodeBlock({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <div className="group relative overflow-x-auto rounded-md border border-border bg-bg-soft px-3 py-3 font-mono text-[11.5px] leading-[1.65] whitespace-pre text-muted">
      {text}
      {onCopy ? (
        <button
          onClick={onCopy}
          className="absolute top-1.5 right-1.5 inline-flex h-6 items-center gap-1 rounded border border-border-2 bg-panel px-2 text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Copy className="size-3" /> Copy
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ audit check */

export function AuditCheckRow({ check }: { check: AuditCheck }) {
  const Icon = check.status === "pass" ? Check : check.status === "warn" ? CircleAlert : X;
  return (
    <div className="flex items-start gap-2.5 border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-4 py-2.5 last:border-0">
      <span
        className={cn(
          "mt-px grid size-4.5 shrink-0 place-items-center rounded-full",
          check.status === "pass" && "bg-[color-mix(in_srgb,var(--ok)_15%,transparent)] text-ok",
          check.status === "warn" && "bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-warn",
          check.status === "fail" && "bg-[color-mix(in_srgb,var(--bad)_15%,transparent)] text-bad"
        )}
      >
        <Icon className="size-2.5 stroke-[2.6]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium">
          {check.label}
          <Badge className="font-mono text-[9.5px]">{check.status}</Badge>
        </div>
        <div className="mt-0.5 text-[11.5px] text-faint">{check.detail}</div>
        {check.status !== "pass" ? (
          <div className="mt-1.5 rounded border-l-2 border-border-2 bg-panel-2 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-muted [&:where([data-status]))]:border-l-bad">
            {check.fix}
          </div>
        ) : null}
      </div>
    </div>
  );
}
