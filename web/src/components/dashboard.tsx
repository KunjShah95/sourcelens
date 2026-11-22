"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { useApp } from "@/app/providers";
import { useRealtime } from "@/lib/hooks";
import { AddSiteModal, AuthScreen, CommandPalette, Sidebar, Topbar } from "./shell";
import { Button, EmptyState } from "./ui";
import { OverviewView } from "./views/overview";
import { AudienceView, PagesView, SourcesView } from "./views/explore";
import { AIView, SEOView } from "./views/grow";
import { SettingsView } from "./views/settings";

const ROUTES = ["overview", "sources", "pages", "audience", "ai", "seo", "settings"];

export function Dashboard() {
  const pathname = usePathname();
  const { me, authLoading, site, sites } = useApp();
  const [palette, setPalette] = useState(false);
  const [addSite, setAddSite] = useState(false);
  const { data: liveData } = useRealtime();

  const route = pathname.split("/").filter(Boolean)[0] || "overview";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") setPalette(false);
      if (e.shiftKey && e.key.toLowerCase() === "d" && !(e.metaKey || e.ctrlKey)) {
        document.querySelector<HTMLButtonElement>('[aria-label="Toggle theme"]')?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-90 grid place-content-center justify-items-center gap-5 bg-bg">
        <div className="size-11 animate-pulse text-accent">
          <svg viewBox="0 0 32 32" className="size-full">
            <circle cx="16" cy="16" r="4.2" fill="currentColor" />
            <path d="M16 3v5M16 24v5M3 16h5M24 16h5M6.8 6.8l3.5 3.5M21.7 21.7l3.5 3.5M25.2 6.8l-3.5 3.5M10.3 21.7l-3.5 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className="h-0.5 w-30 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 animate-[shimmer_1.1s_linear_infinite] rounded-full bg-accent" />
        </div>
      </div>
    );
  }

  if (!me?.authenticated) return <AuthScreen />;

  const view = ROUTES.includes(route) ? route : "overview";
  const openAdd = () => setAddSite(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar live={liveData?.realtime.active || 0} onOpenPalette={() => setPalette(true)} onAddSite={openAdd} />
        <main className="mx-auto w-full max-w-370 flex-1 px-3 pt-5 pb-14 sm:px-5">
          {!site && !sites.length ? (
            <Cardish>
              <EmptyState
                title="Add your first site"
                sub="SourceLens needs a domain to attribute traffic to. Add one, then paste the tracker snippet on your site."
                icon={<Layers className="size-5" />}
              />
              <Button variant="primary" onClick={openAdd} className="mt-2"><Plus className="size-3.5" /> Add site</Button>
            </Cardish>
          ) : !site ? (
            <Cardish><EmptyState title="Select a site" sub="Choose a site from the switcher above." icon={<Layers className="size-5" />} /></Cardish>
          ) : (
            <div key={view} className="animate-[viewIn_260ms_var(--ease-out)]">
              {view === "overview" ? <OverviewView /> : null}
              {view === "sources" ? <SourcesView /> : null}
              {view === "pages" ? <PagesView /> : null}
              {view === "audience" ? <AudienceView /> : null}
              {view === "ai" ? <AIView /> : null}
              {view === "seo" ? <SEOView /> : null}
              {view === "settings" ? <SettingsView /> : null}
            </div>
          )}
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} onAddSite={openAdd} />
      <AddSiteModal open={addSite} onClose={() => setAddSite(false)} />
    </div>
  );
}

function Cardish({ children }: { children: React.ReactNode }) {
  return <div className="mt-10 grid place-items-center rounded-[14px] border border-border bg-panel p-12 text-center shadow-[var(--shadow-1)]">{children}</div>;
}
