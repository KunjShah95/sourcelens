"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Minus, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------- logo */

export function Logo({ compact, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="SourceLens home">
      <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-accent text-accent-ink shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent),0_8px_20px_-10px_color-mix(in_srgb,var(--accent)_75%,transparent)] transition-transform duration-200 group-hover:rotate-12">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden="true">
          <circle cx="16" cy="16" r="4" fill="currentColor" />
          <path
            d="M16 4v4.5M16 23.5V28M4 16h4.5M23.5 16H28M7.6 7.6l3.2 3.2M21.2 21.2l3.2 3.2M24.4 7.6l-3.2 3.2M10.8 21.2l-3.2 3.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">SourceLens</span>
          <span className="rounded border border-border px-1 py-px font-mono text-[9px] text-faint">v1</span>
        </span>
      ) : null}
    </Link>
  );
}

/* ------------------------------------------------------------ copy button */

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable — nothing to do */
        }
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border border-border-2 bg-panel px-2.5 text-[11.5px] text-muted transition-colors hover:border-accent hover:text-ink",
        className
      )}
    >
      {copied ? <Check className="size-3 text-accent" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/* ---------------------------------------------------------------- checklist */

export function CheckList({ items, accent }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
          <Check
            className={cn("mt-0.5 size-3.5 shrink-0 stroke-[2.4]", accent ? "text-accent" : "text-ok")}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------- FAQ */

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-panel">
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(expanded ? null : i)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-panel-2"
            >
              <span className="flex-1 text-[14px] font-medium tracking-[-0.01em]">{item.q}</span>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-faint">
                {expanded ? <Minus className="size-3" /> : <Plus className="size-3" />}
              </span>
            </button>
            {expanded ? (
              <div className="px-5 pb-5 text-[13px] leading-[1.75] text-muted">{item.a}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- pricing cards */

const TIERS = [
  {
    name: "Self-hosted",
    price: "$0",
    period: "forever",
    desc: "The entire product, running on your own infrastructure. No limits, no phone-home.",
    cta: "Get started free",
    href: "/signup",
    featured: false,
    features: [
      "Unlimited sites and events",
      "Full source attribution engine",
      "SEO, AEO & GEO audits",
      "llms.txt generator",
      "AI crawler intelligence",
      "Supabase or local SQLite",
      "MIT licensed, no vendor lock-in",
    ],
  },
  {
    name: "Cloud",
    price: "$19",
    period: "per month",
    desc: "We host the API, database and dashboard. Same product, zero ops. Ideal if you want the signal without the servers.",
    cta: "Start cloud trial",
    href: "/signup",
    featured: true,
    features: [
      "Everything in Self-hosted",
      "Managed Supabase project",
      "Automatic backups and updates",
      "Shared CDN for the tracker",
      "Email support",
      "99.9% uptime target",
      "Cancel any time",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "let's talk",
    desc: "For teams with compliance, residency or volume requirements that need a hand.",
    cta: "Contact us",
    href: "/about",
    featured: false,
    features: [
      "Everything in Cloud",
      "Dedicated infrastructure or VPC",
      "Custom data residency",
      "SSO / SAML and audit logs",
      "Retention and DPA controls",
      "Onboarding and migration help",
      "Priority support",
    ],
  },
];

export function PricingCards() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "relative flex flex-col rounded-[16px] border bg-panel p-6",
            tier.featured
              ? "border-[color-mix(in_srgb,var(--accent)_48%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent),0_30px_70px_-40px_color-mix(in_srgb,var(--accent)_55%,transparent)]"
              : "border-border shadow-[var(--shadow-1)]"
          )}
        >
          {tier.featured ? (
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.03em] text-accent-ink uppercase">
              <Sparkles className="size-3" /> Most popular
            </span>
          ) : null}
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold">{tier.name}</h3>
            {!tier.featured ? <span className="font-mono text-[10px] text-faint">0{String(TIERS.indexOf(tier) + 1).padStart(2, "0")}</span> : null}
          </div>
          <p className="mt-2 min-h-15 text-[12.5px] leading-relaxed text-muted">{tier.desc}</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[38px] leading-none font-semibold tracking-[-0.05em]">{tier.price}</span>
            <span className="text-[12.5px] text-faint">{tier.period}</span>
          </div>
          <Link
            href={tier.href}
            className={cn(
              "mt-5 inline-flex h-9.5 items-center justify-center rounded-md text-[12.5px] font-semibold transition-colors",
              tier.featured
                ? "bg-accent text-accent-ink hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--ink))]"
                : "border border-border-2 bg-panel-2 text-ink hover:bg-panel-3"
            )}
          >
            {tier.cta}
          </Link>
          <div className="my-5 h-px bg-border" />
          <CheckList items={tier.features} accent={tier.featured} />
        </div>
      ))}
    </div>
  );
}
