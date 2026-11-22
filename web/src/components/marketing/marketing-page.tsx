import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function MarketingPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="mk-grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_90%_at_50%_0%,#000_20%,transparent_85%)]" />
          <div className="mk-glow pointer-events-none absolute inset-x-0 -top-52 h-[520px]" />
          <div className="relative mx-auto max-w-360 px-4 py-20 text-center sm:px-6 sm:py-26">
            <span className="font-mono text-[11px] tracking-[0.14em] text-accent uppercase">{eyebrow}</span>
            <h1 className="mx-auto mt-5 max-w-5xl text-[30px] leading-[1.1] font-semibold tracking-[-0.04em] sm:text-[42px]">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[14.5px] leading-[1.75] text-muted">{description}</p>
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function ProseSection({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mk-section border-b border-border py-18">
      <div className="mx-auto max-w-360 px-4 sm:px-6">
        {eyebrow ? <span className="font-mono text-[10.5px] tracking-[0.12em] text-accent uppercase">{eyebrow}</span> : null}
        <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
