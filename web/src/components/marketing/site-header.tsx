"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { Logo } from "./marketing-ui";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-[color-mix(in_srgb,var(--bg)_84%,transparent)] backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-360 items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="inline-flex h-8.5 items-center rounded-md px-3 text-[12.5px] font-medium text-muted transition-colors hover:bg-panel-2 hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex h-8.5 items-center gap-1.5 rounded-md bg-accent px-3.5 text-[12.5px] font-semibold text-accent-ink transition-[background,transform] hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--ink))] active:translate-y-px"
          >
            Get started free
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-9 place-items-center rounded-md border border-border bg-panel text-muted md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="animate-pop border-t border-border bg-panel px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-2 py-2.5 text-[13.5px] text-muted hover:bg-panel-2 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            <Link href="/login" className="rounded-md px-2 py-2.5 text-[13.5px] text-muted hover:bg-panel-2 hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-ink">
              Get started free
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
