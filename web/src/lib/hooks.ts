"use client";

import { useQuery } from "@tanstack/react-query";
import { getLatestAudit, getRealtime, getStats } from "./api";
import { useApp } from "@/app/providers";

export function useStats() {
  const { site, range } = useApp();
  return useQuery({
    queryKey: ["stats", site?.id, range],
    queryFn: () => getStats(site!.id, range),
    enabled: Boolean(site),
    placeholderData: (previous) => previous,
  });
}

export function useRealtime(enabled = true) {
  const { site } = useApp();
  return useQuery({
    queryKey: ["realtime", site?.id],
    queryFn: () => getRealtime(site!.id),
    enabled: Boolean(site) && enabled,
    refetchInterval: 20_000,
  });
}

export function useLatestAudit(enabled = true) {
  const { site } = useApp();
  return useQuery({
    queryKey: ["audit", "latest", site?.id],
    queryFn: () => getLatestAudit(site!.id),
    enabled: Boolean(site) && enabled,
  });
}
