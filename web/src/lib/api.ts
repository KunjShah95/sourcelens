import type {
  AuditPayload,
  MeResponse,
  Realtime,
  Site,
  StatsPayload,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (res.status === 401) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const getMe = () => api<MeResponse>("/api/auth/me");
export const getSites = () => api<{ sites: Site[] }>("/api/sites");
export const createSite = (domain: string, name: string) =>
  api<{ site: Site }>("/api/sites", {
    method: "POST",
    body: JSON.stringify({ domain, name }),
  });
export const deleteSite = (id: number) =>
  api<{ ok: boolean }>(`/api/sites/${id}`, { method: "DELETE" });

export const getStats = (siteId: number, range: string) =>
  api<StatsPayload>(`/api/stats?site=${siteId}&range=${range}`);
export const getRealtime = (siteId: number) =>
  api<{ realtime: Realtime }>(`/api/stats/realtime?site=${siteId}`);

export const runAudit = (url: string, siteId?: number) =>
  api<AuditPayload>(`/api/audit?url=${encodeURIComponent(url)}&site=${siteId || ""}`);
export const getLatestAudit = (siteId: number) =>
  api<{ audit: AuditPayload | null }>(`/api/audit/latest?site=${siteId}`);

export const login = (email: string, password: string) =>
  api<{ needsConfirmation?: boolean; user?: unknown }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const signup = (email: string, password: string) =>
  api<{ needsConfirmation?: boolean }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const logout = () =>
  api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

export async function getLlmsTxt(siteId: number): Promise<string> {
  const res = await fetch(`/api/llms-txt?site=${siteId}`, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError("Could not generate llms.txt", res.status);
  return res.text();
}

export async function exportCsv(siteId: number, range: string): Promise<void> {
  const res = await fetch(`/api/export?site=${siteId}&range=${range}`, {
    credentials: "same-origin",
  });
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const data = (await res.json()) as { signedUrl?: string };
    if (data.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener");
      return;
    }
  }
  if (!res.ok) throw new ApiError("Export failed", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sourcelens-${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
