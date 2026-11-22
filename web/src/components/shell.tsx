"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  Globe2,
  Keyboard,
  LayoutGrid,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Waypoints,
} from "lucide-react";
import { useApp, RANGES, type RangeKey } from "@/app/providers";
import { cn, fmt } from "@/lib/utils";
import { Button, Field, inputClass, Modal } from "./ui";
import { createSite } from "@/lib/api";

export const NAV = [
  { group: "Analyze", items: [
    { route: "overview", label: "Overview", icon: LayoutGrid },
    { route: "sources", label: "Sources", icon: Waypoints },
    { route: "pages", label: "Pages", icon: FileText },
    { route: "audience", label: "Audience", icon: Globe2 },
  ] },
  { group: "Grow", items: [
    { route: "ai", label: "AI visibility", icon: Sparkles, pill: "AEO" },
    { route: "seo", label: "SEO audit", icon: Search },
  ] },
  { group: "Manage", items: [
    { route: "settings", label: "Settings", icon: Settings2 },
  ] },
] as const;

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-0.5">
      <span className="grid size-6.5 shrink-0 place-items-center rounded-[8px] bg-accent text-accent-ink shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_60%,transparent),0_6px_16px_-8px_color-mix(in_srgb,var(--accent)_70%,transparent)]">
        <svg viewBox="0 0 32 32" className="size-4" aria-hidden="true">
          <circle cx="16" cy="16" r="4" fill="currentColor" />
          <path d="M16 4v4.5M16 23.5V28M4 16h4.5M23.5 16H28M7.6 7.6l3.2 3.2M21.2 21.2l3.2 3.2M24.4 7.6l-3.2 3.2M10.8 21.2l-3.2 3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      {!compact ? (
        <>
          <span className="text-[14.5px] font-semibold tracking-[-0.015em]">SourceLens</span>
          <span className="rounded border border-border px-1 py-px font-mono text-[9.5px] text-faint">v1</span>
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- sidebar */

export function Sidebar() {
  const pathname = usePathname();
  const {
    me, mode, theme, toggleTheme, signOut, sites,
  } = useApp();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = pathname.split("/").filter(Boolean)[0] || "overview";
  const name = me?.user?.name || me?.user?.email || "Workspace";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <aside className="sticky top-0 flex h-screen w-[68px] shrink-0 flex-col gap-4 border-r border-border bg-bg-soft px-2 py-4 lg:w-[246px] lg:px-3 lg:py-4">
      <div className="flex justify-center lg:hidden"><Brand compact /></div>
      <div className="hidden justify-center lg:flex"><Brand /></div>

      <nav className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="hidden px-2 pt-3.5 pb-1.5 text-[10.5px] font-medium tracking-[0.09em] text-faint uppercase first:pt-1 lg:block">
              {group.group}
            </div>
            <div className="h-2 lg:hidden" />
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = current === item.route;
              return (
                <a
                  key={item.route}
                  href={`/${item.route}`}
                  title={item.label}
                  className={cn(
                    "relative flex items-center justify-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] text-muted transition-colors hover:bg-panel-2 hover:text-ink lg:justify-start lg:py-1.8",
                    active && "bg-panel-3 font-medium text-ink"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0 stroke-[1.7]", active && "text-accent")} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {"pill" in item && item.pill ? (
                    <span className="ml-auto hidden rounded border border-[color-mix(in_srgb,var(--channel-ai)_25%,transparent)] bg-[color-mix(in_srgb,var(--channel-ai)_13%,transparent)] px-1 py-px font-mono text-[9px] tracking-[0.04em] text-ch-ai lg:inline">
                      {item.pill}
                    </span>
                  ) : null}
                  {active ? <span className="absolute top-1/2 -left-1 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" /> : null}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative flex flex-col gap-2 border-t border-border pt-2.5">
        <div className="hidden items-center gap-1.5 self-start rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] text-faint lg:inline-flex">
          <span className={cn("size-1.5 rounded-full", mode === "supabase" ? "bg-ok" : "bg-warn")} />
          <span>{mode === "supabase" ? "Supabase" : "SQLite"}</span>
        </div>
        <button
          onClick={() => setMenu((v) => !v)}
          className="flex items-center justify-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-panel-2 lg:justify-start"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border-2 bg-linear-[145deg,var(--panel-3),var(--panel-2)] text-[11px] font-semibold">
            {initials(name)}
          </span>
          <span className="hidden min-w-0 flex-1 flex-col leading-tight lg:flex">
            <span className="truncate text-[12.5px] font-medium">{name}</span>
            <span className="truncate text-[11px] text-faint">{me?.user?.email || "local"}</span>
          </span>
          <ChevronDown className="hidden size-3.5 text-faint lg:block" />
        </button>
        {menu ? (
          <div className="absolute bottom-13 left-0 right-0 z-40 rounded-lg border border-border-2 bg-panel-2 p-1 shadow-[var(--shadow-2)]">
            <button
              onClick={() => { toggleTheme(); setMenu(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-muted hover:bg-panel-3 hover:text-ink"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              <span>Toggle theme</span>
              <kbd className="ml-auto font-mono text-[9.5px] text-faint">⇧D</kbd>
            </button>
            <button
              onClick={() => { signOut(); setMenu(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-muted hover:bg-panel-3 hover:text-ink"
            >
              <LogOut className="size-3.5" /> <span>Sign out</span>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function initials(value: string) {
  return String(value).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "SL";
}

/* ---------------------------------------------------------------- topbar */

export function Topbar({
  live,
  onOpenPalette,
  onAddSite,
}: {
  live: number;
  onOpenPalette: () => void;
  onAddSite: () => void;
}) {
  const { site, sites, selectSite, theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-25 flex h-14.5 items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-3 backdrop-blur-xl sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-panel-2"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border-2 bg-panel-3 text-[11px] font-semibold">
              {(site?.domain || "S")[0]?.toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-36 truncate text-[13px] font-medium tracking-[-0.01em]">{site?.name || "No site"}</span>
              <span className="max-w-36 truncate font-mono text-[10.5px] text-faint">{site?.domain || "add a domain"}</span>
            </span>
            <ChevronDown className="size-3.5 text-faint" />
          </button>
          {open ? (
            <div className="absolute top-full left-0 z-45 mt-1.5 min-w-68 rounded-lg border border-border-2 bg-panel-2 p-1 shadow-[var(--shadow-2)]">
              {sites.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { selectSite(s.id); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-panel-3"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border-2 bg-panel-3 text-[11px] font-semibold">
                    {s.domain[0]?.toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <b className="truncate text-[12.5px] font-medium">{s.name}</b>
                    <span className="truncate font-mono text-[10px] text-faint">{s.domain} · {fmt.num(s.events)} events</span>
                  </span>
                  {site?.id === s.id ? <Check className="size-3.5 text-accent" /> : null}
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => { setOpen(false); onAddSite(); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-accent hover:bg-accent-soft"
              >
                <Plus className="size-3.5 stroke-2" /> Add site
              </button>
            </div>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-2 py-0.5 text-[11.5px] text-muted">
          <span className="live-dot size-1.5 rounded-full bg-ok" />
          <b className="tabular font-mono font-medium text-ink">{live}</b>
          <span className="hidden sm:inline">live</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPalette}
          className="flex h-7.5 items-center gap-2 rounded-md border border-border bg-panel px-2.5 text-[12.5px] text-faint transition-colors hover:border-border-2 hover:text-muted"
        >
          <Search className="size-3.5 stroke-[1.8]" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="rounded border border-border-2 bg-panel-2 px-1 py-px font-mono text-[9.5px]">⌘K</kbd>
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid size-7.5 place-items-center rounded-md border border-transparent text-muted transition-colors hover:border-border hover:bg-panel-2 hover:text-ink"
        >
          {theme === "dark" ? <Moon className="size-4 stroke-[1.75]" /> : <Sun className="size-4 stroke-[1.75]" />}
        </button>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------- palette */

export function CommandPalette({
  open,
  onClose,
  onAddSite,
}: {
  open: boolean;
  onClose: () => void;
  onAddSite: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sites, selectSite, range, setRange, theme, toggleTheme } = useApp();

  const items = useMemo(() => {
    const list: { group: string; label: string; hint?: string; icon: ReactNode; run: () => void }[] = [];
    for (const group of NAV) {
      for (const item of group.items) {
        list.push({
          group: "Navigate",
          label: item.label,
          icon: <item.icon className="size-3.5" />,
          run: () => router.push(`/${item.route}`),
        });
      }
    }
    list.push(
      { group: "Actions", label: "Toggle theme", icon: <Moon className="size-3.5" />, run: toggleTheme },
      { group: "Actions", label: "Add a site", icon: <Plus className="size-3.5" />, run: onAddSite },
    );
    for (const r of RANGES) {
      list.push({ group: "Range", label: `Last ${r}`, hint: range === r ? "active" : undefined, icon: <Keyboard className="size-3.5" />, run: () => setRange(r) });
    }
    for (const s of sites) {
      list.push({ group: "Sites", label: s.name, hint: s.domain, icon: <Globe2 className="size-3.5" />, run: () => selectSite(s.id) });
    }
    return list;
  }, [router, sites, range, setRange, theme, toggleTheme, onAddSite, selectSite]);

  const filtered = items.filter(
    (item) => !query.trim() || item.label.toLowerCase().includes(query.toLowerCase()) || (item.hint || "").toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const run = (index: number) => {
    const item = filtered[index];
    if (!item) return;
    onClose();
    item.run();
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-80 grid place-items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[3px]" onClick={onClose} />
      <div className="animate-pop relative w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-[14px] border border-border-2 bg-panel shadow-[var(--shadow-2)]">
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search className="size-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((v) => (v + 1) % Math.max(1, filtered.length)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((v) => (v - 1 + filtered.length) % Math.max(1, filtered.length)); }
              if (e.key === "Enter") { e.preventDefault(); run(active); }
            }}
            placeholder="Search pages, sources, actions…"
            className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-border-2 bg-panel-2 px-1 py-px font-mono text-[9.5px] text-faint">esc</kbd>
        </div>
        <div className="max-h-85 overflow-y-auto p-1.5">
          {filtered.length ? filtered.map((item, i) => {
            const heading = item.group !== lastGroup ? <div className="px-2 pt-2 pb-1 text-[10px] tracking-[0.08em] text-faint uppercase">{item.group}</div> : null;
            lastGroup = item.group;
            return (
              <div key={`${item.group}-${item.label}-${i}`}>
                {heading}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[12.5px] text-muted",
                    active === i && "bg-panel-3 text-ink"
                  )}
                >
                  <span className="text-faint [&>svg]:stroke-[1.8]">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.hint ? <span className="ml-auto font-mono text-[10px] text-faint">{item.hint}</span> : null}
                </button>
              </div>
            );
          }) : <div className="py-10 text-center text-[12.5px] text-faint">No matches</div>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ add site ---- */

export function AddSiteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast, reloadSites, selectSite } = useApp();
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!domain.trim()) { toast("Enter a domain", "err"); return; }
    setBusy(true);
    try {
      const { site } = await createSite(domain.trim(), name.trim() || domain.trim());
      await reloadSites();
      selectSite(site.id);
      toast(`Added ${site.domain}`);
      setDomain(""); setName("");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add site", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add a site"
      open={open}
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={submit}>{busy ? "Adding…" : "Add site"}</Button></>}
    >
      <Field label="Domain" hint="Bare domain — no https:// and no trailing slash.">
        <input className={inputClass} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
      </Field>
      <Field label="Display name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="My site" />
      </Field>
    </Modal>
  );
}

/* ---------------------------------------------------------- auth screen -- */

export function AuthScreen({ message }: { message?: string }) {
  const { reloadMe, toast } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(message || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Email and password are required."); return; }
    setBusy(true);
    try {
      const { login, signup } = await import("@/lib/api");
      const result = mode === "login" ? await login(email, password) : await signup(email, password);
      if (result?.needsConfirmation) {
        toast("Check your inbox to confirm your email, then sign in.");
        setMode("login");
      } else {
        await reloadMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden border-r border-border bg-bg-soft md:flex md:flex-col">
        <div
          className="absolute inset-[-1px] opacity-80"
          style={{
            backgroundImage: "linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 70% at 20% 10%,#000 30%,transparent 78%)",
          }}
        />
        <div className="absolute -bottom-60 -left-40 size-130 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_13%,transparent),transparent_68%)] blur-5xl" />
        <div className="relative flex h-full flex-col gap-10 p-10">
          <Brand />
          <div className="mt-auto max-w-115">
            <h1 className="text-[30px] leading-[1.18] font-semibold tracking-[-0.035em]">
              Every visit has an origin.<br />See all of them.
            </h1>
            <p className="mt-3 max-w-105 text-[13.5px] leading-relaxed text-muted">
              Search, AI assistants, social, referrals and paid — classified at the edge, stored in your own Supabase project.
            </p>
            <ul className="mt-7 flex flex-col gap-3.5">
              {[
                ["Origin-level attribution", "ChatGPT, Perplexity and Claude tracked separately from organic search."],
                ["AEO & GEO audits", "Score whether models can read, quote and cite you."],
                ["Crawler visibility", "GPTBot, ClaudeBot and PerplexityBot hits per page."],
              ].map(([title, sub]) => (
                <li key={title} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent stroke-[1.9]" />
                  <div><strong className="block text-[12.5px] font-medium">{title}</strong><span className="text-[12px] leading-relaxed text-faint">{sub}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto font-mono text-[10.5px] tracking-[0.02em] text-faint">Privacy-first · cookieless · self-hosted</div>
        </div>
      </div>

      <div className="grid place-content-center justify-items-center gap-4 px-5 py-10">
        <div className="w-full max-w-95 rounded-[18px] border border-border bg-panel p-6.5 shadow-[var(--shadow-1)]">
          <h2 className="text-[19px] font-semibold tracking-[-0.025em]">{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            {mode === "login" ? "Sign in to your SourceLens workspace." : "Start tracking traffic sources in under a minute."}
          </p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
            <Field label="Email"><input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></Field>
            <Field label="Password"><input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>
            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--bad)_25%,transparent)] bg-[color-mix(in_srgb,var(--bad)_10%,transparent)] px-2.5 py-2 text-[12px] text-bad">
                <CircleAlert className="mt-px size-3.5 shrink-0" />{error}
              </div>
            ) : null}
            <Button variant="primary" type="submit" disabled={busy} className="mt-1 h-9.5 w-full">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 flex justify-center gap-1.5 text-[12.5px] text-faint">
            <span>{mode === "login" ? "New here?" : "Already have an account?"}</span>
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="font-medium text-accent hover:underline">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-faint">Protected by Supabase Auth · Your data stays in your project</p>
      </div>
    </div>
  );
}
