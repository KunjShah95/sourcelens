"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { getMe, getSites, logout as apiLogout } from "@/lib/api";
import type { MeResponse, Site } from "@/lib/types";

export type RangeKey = "24h" | "7d" | "30d" | "90d";
export const RANGES: RangeKey[] = ["24h", "7d", "30d", "90d"];

interface ToastItem {
  id: number;
  message: string;
  kind: "ok" | "err";
}

interface AppContextValue {
  me: MeResponse | null;
  authLoading: boolean;
  mode: "sqlite" | "supabase";
  authEnabled: boolean;
  reloadMe: () => void;
  signOut: () => Promise<void>;
  sites: Site[];
  site: Site | null;
  selectSite: (id: number) => void;
  reloadSites: () => Promise<void>;
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  toast: (message: string, kind?: "ok" | "err") => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside <Providers>");
  return value;
}

function AppState({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [siteId, setSiteId] = useState<number | null>(null);
  const [range, setRangeState] = useState<RangeKey>("7d");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("sl-theme");
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    const savedRange = localStorage.getItem("sl-range") as RangeKey | null;
    if (savedRange && RANGES.includes(savedRange)) setRangeState(savedRange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sl-theme", theme);
  }, [theme]);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const sitesQuery = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
    enabled: Boolean(meQuery.data?.authenticated),
  });

  const sites = sitesQuery.data?.sites || [];

  useEffect(() => {
    if (siteId || !sites.length) return;
    const saved = Number(localStorage.getItem("sl-site"));
    const found = sites.find((s) => s.id === saved) || sites[0];
    setSiteId(found.id);
  }, [sites, siteId]);

  const site = useMemo(
    () => sites.find((s) => s.id === siteId) || null,
    [sites, siteId]
  );

  const selectSite = useCallback((id: number) => {
    setSiteId(id);
    localStorage.setItem("sl-site", String(id));
    queryClient.removeQueries({ queryKey: ["stats"] });
  }, [queryClient]);

  const setRange = useCallback((next: RangeKey) => {
    setRangeState(next);
    localStorage.setItem("sl-range", next);
  }, []);

  const toast = useCallback((message: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reloadSites = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["sites"] });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    queryClient.clear();
    await meQuery.refetch();
  }, [queryClient, meQuery]);

  const value: AppContextValue = {
    me: meQuery.data || null,
    authLoading: meQuery.isLoading,
    mode: meQuery.data?.mode || "sqlite",
    authEnabled: Boolean(meQuery.data?.authEnabled),
    reloadMe: () => meQuery.refetch(),
    signOut,
    sites,
    site,
    selectSite,
    reloadSites,
    range,
    setRange,
    theme,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    toast,
    toasts,
    dismissToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-100 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border border-border-2 bg-panel-3 px-3.5 py-2.5 text-[12.5px] text-ink shadow-[var(--shadow-2)]"
          >
            {t.kind === "ok" ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-ok" />
            ) : (
              <CircleAlert className="size-3.5 shrink-0 text-bad" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppState>{children}</AppState>
    </QueryClientProvider>
  );
}
