"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Code2, Copy, Database, Download, Eye, Globe2, Layers, Plus, Zap, X } from "lucide-react";
import { useApp } from "@/app/providers";
import { api, deleteSite, exportCsv } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Button, Card, CardHead, CodeBlock, EmptyState, Modal, Table, Td, Th } from "@/components/ui";
import { PageHead } from "./overview";
import { AddSiteModal } from "@/components/shell";

export function SettingsView() {
  const { site, sites, me, mode, authEnabled: _authEnabled, range, toast, reloadSites, selectSite } = useApp();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [widget, setWidget] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = site ? `<script defer src="${origin}/t.js" data-site="${site.key}"></script>` : "";
  const widgetSnippet = site ? `<iframe src="${origin}/embed?key=${site.key}" width="230" height="56" style="border:0;overflow:hidden" title="Live visitors"></iframe>` : "";

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast(label); }
    catch { toast("Copy failed — select and copy manually", "err"); }
  };

  const remove = async (id: number) => {
    try {
      await deleteSite(id);
      await reloadSites();
      if (site?.id === id) {
        const remaining = sites.filter((s) => s.id !== id);
        if (remaining[0]) selectSite(remaining[0].id);
      }
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast("Site removed");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove site", "err");
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const result = await api<{ total: number }>("/api/demo/seed", { method: "POST" });
      await reloadSites();
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast(`Loaded ${fmt.num(result.total)} demo events`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not seed demo data", "err");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <PageHead title="Settings" sub="Workspace, tracking installation and data controls" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Connection" hint="runtime" icon={<Database />} />
          <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3.5 gap-y-2 p-4 text-[12.5px]">
            <dt className="text-faint">Database</dt><dd className="break-all font-mono text-[11.5px]">{mode === "supabase" ? "Supabase (Postgres)" : "Local SQLite"}</dd>
            <dt className="text-faint">Auth</dt><dd className="break-all font-mono text-[11.5px]">{me?.authEnabled ? "Supabase Auth" : "Open (local mode)"}</dd>
            <dt className="text-faint">Storage</dt><dd className="break-all font-mono text-[11.5px]">{mode === "supabase" ? "Supabase Storage" : "Direct download"}</dd>
            <dt className="text-faint">Tracker</dt><dd className="break-all font-mono text-[11.5px]">{origin}/t.js</dd>
            <dt className="text-faint">Signed in as</dt><dd className="break-all font-mono text-[11.5px]">{me?.user?.email || "local"}</dd>
          </dl>
          {mode === "sqlite" ? (
            <div className="mx-4 mb-4 flex items-start gap-2.25 rounded-md border border-[color-mix(in_srgb,var(--warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--warn)_7%,transparent)] p-2.5 text-[12px] leading-relaxed text-muted">
              <AlertCircle className="mt-0.5 size-3.75 shrink-0 text-warn" />
              <div>Running locally. Add <code className="font-mono">SUPABASE_URL</code>, <code className="font-mono">SUPABASE_SERVICE_KEY</code> and <code className="font-mono">SUPABASE_ANON_KEY</code> to switch to Supabase — see README.</div>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHead title="Install the tracker" hint="one line" icon={<Code2 />} />
          <div className="flex flex-col gap-2.5 p-4">
            {site ? (
              <>
                <CodeBlock text={snippet} onCopy={() => copy(snippet, "Snippet copied")} />
                <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
                  <Zap className="mt-0.5 size-3.75 shrink-0 text-accent" />
                  <div>Paste before <code className="font-mono text-[11px]">&lt;/body&gt;</code>. Works with any stack, CMS or framework. SPA route changes are tracked automatically.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => copy(snippet, "Snippet copied")}><Copy className="size-3.5" /> Copy snippet</Button>
                  <Button size="sm" onClick={() => setWidget(true)}><Code2 className="size-3.5" /> Live badge</Button>
                </div>
              </>
            ) : <EmptyState title="Add a site first" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Sites" icon={<Globe2 />} action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> Add site</Button>} />
        {sites.length ? (
          <Table head={<><Th>Domain</Th><Th>Name</Th><Th>Site key</Th><Th num>Events</Th><Th num>Last seen</Th><Th /></>}>
            {sites.map((s) => (
              <tr key={s.id} className="hover:bg-[color-mix(in_srgb,var(--panel-2)_70%,transparent)]">
                <Td strong>{s.domain}</Td><Td>{s.name}</Td>
                <Td><span className="font-mono text-[10.5px] text-faint">{s.key}</span></Td>
                <Td num>{fmt.num(s.events)}</Td><Td num>{s.last_seen ? `${fmt.ago(s.last_seen)} ago` : "—"}</Td>
                <Td><button onClick={() => remove(s.id)} className="ml-auto rounded p-1 text-faint hover:bg-panel-3 hover:text-bad" aria-label="Delete site"><X className="size-3.5" /></button></Td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No sites yet" sub="Add a domain to start collecting traffic." />}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Custom events API" icon={<Code2 />} />
          <div className="flex flex-col gap-2.5 p-4">
            <CodeBlock text={`sourcelens.track('signup', {\n  plan: 'pro',\n  source: 'pricing_page'\n})`} />
            <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
              <Zap className="mt-0.5 size-3.75 shrink-0 text-accent" />
              <div>Use it for signups, checkout steps and any conversion that is not a pageview. Props are stored as JSON.</div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHead title="Data & retention" icon={<Download />} />
          <div className="flex flex-col gap-2.5 p-4">
            <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
              <Eye className="mt-0.5 size-3.75 shrink-0" />
              <div>No cookies, no IP storage. Visitors are counted with a salted daily hash, so repeat visits are visible for one day and never beyond.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => exportCsv(site!.id, range).catch((e) => toast(e.message, "err"))}><Download className="size-3.5" /> Export 30 days (CSV)</Button>
              <Button size="sm" disabled={seeding} onClick={seed}><Zap className="size-3.5" /> {seeding ? "Seeding…" : "Load demo data"}</Button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-faint">Exports are written to Supabase Storage and returned as a 24-hour signed URL when storage is configured; otherwise they download directly.</p>
          </div>
        </Card>
      </div>

      <AddSiteModal open={addOpen} onClose={() => setAddOpen(false)} />
      <Modal title="Live visitor badge" open={widget} onClose={() => setWidget(false)}>
        <p className="text-[12.5px] text-muted">Embed this iframe anywhere — docs, a status page or your marketing site footer.</p>
        <CodeBlock text={widgetSnippet} onCopy={() => copy(widgetSnippet, "Badge copied")} />
        <div className="flex items-start gap-2.25 rounded-md border border-border bg-panel-2 p-2.5 text-[12px] leading-relaxed text-muted">
          <Eye className="mt-0.5 size-3.75 shrink-0" />
          <div>It polls a public, read-only counter endpoint that exposes only the active visitor count for that site key.</div>
        </div>
      </Modal>
    </div>
  );
}
