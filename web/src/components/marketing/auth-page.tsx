"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/app/providers";
import { login, signup } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "./marketing-ui";
import { SiteHeader } from "./site-header";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { me, reloadMe, toast } = useApp();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const demoMode = me && !me.authEnabled;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter both your email and password.");
      return;
    }
    if (isSignup && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      const result = isSignup ? await signup(email.trim(), password) : await login(email.trim(), password);
      if ("needsConfirmation" in result && result.needsConfirmation) {
        toast("Check your inbox to confirm your email, then sign in.");
        router.push("/login");
        return;
      }
      await reloadMe();
      toast(isSignup ? "Workspace created" : "Welcome back");
      router.push("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      {/* ------------------------------------------------------------- left */}
      <div className="relative hidden overflow-hidden border-r border-border bg-bg-soft lg:flex lg:flex-col">
        <div className="mk-grid-bg pointer-events-none absolute inset-0 opacity-80 [mask-image:radial-gradient(ellipse_80%_65%_at_15%_5%,#000_25%,transparent_80%)]" />
        <div className="pointer-events-none absolute -bottom-64 -left-48 size-150 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_15%,transparent),transparent_68%)] blur-3xl" />
        <div className="relative flex h-full flex-col gap-10 p-10 xl:p-14">
          <Logo />

          <div className="mt-auto max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[10.5px] tracking-[0.07em] text-muted uppercase">
              <Sparkles className="size-3 text-accent" /> Traffic source intelligence
            </span>
            <h1 className="mt-6 text-[34px] leading-[1.14] font-semibold tracking-[-0.04em] xl:text-[42px]">
              Every visit has an origin.
              <br />
              <span className="mk-text-gradient">See all of them.</span>
            </h1>
            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-muted">
              Search, AI assistants, social, referrals and paid — classified at the edge, stored in your own Supabase project.
            </p>

            <ul className="mt-9 flex flex-col gap-4">
              {[
                ["Origin-level attribution", "ChatGPT and Perplexity tracked separately from organic search."],
                ["AEO & GEO audits", "Score whether models can read, quote and cite you."],
                ["Crawler visibility", "GPTBot, ClaudeBot and PerplexityBot hits per page."],
              ].map(([title, sub]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                  <div>
                    <strong className="block text-[12.5px] font-medium">{title}</strong>
                    <span className="text-[11.5px] leading-relaxed text-faint">{sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10.5px] text-faint">
            <ShieldCheck className="size-3.5 text-accent" /> Privacy-first · cookieless · self-hosted
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ right */}
      <div className="relative flex flex-col">
        <div className="lg:hidden">
          <SiteHeader />
        </div>
        <div className="hidden justify-end px-8 pt-7 lg:flex">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-3.5" /> Back to home
          </Link>
        </div>

        <div className="grid flex-1 place-content-center justify-items-center px-5 py-12">
          <div className="w-full max-w-100">
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>

            <h2 className="text-[26px] font-semibold tracking-[-0.035em]">
              {isSignup ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="mt-2 text-[13px] text-muted">
              {isSignup
                ? "Start tracking traffic sources in under a minute."
                : "Sign in to your SourceLens workspace."}
            </p>

            {demoMode ? (
              <div className="mt-7 flex flex-col gap-4">
                <div className="flex items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] p-3.5 text-[12px] leading-relaxed text-muted">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div>
                    <b className="text-ink">Local demo mode.</b> Auth is disabled because Supabase isn&apos;t configured — the dashboard is already open with seeded data.
                  </div>
                </div>
                <Link
                  href="/overview"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent text-[13px] font-semibold text-accent-ink"
                >
                  Open the dashboard <ArrowRight className="size-4" />
                </Link>
                <p className="text-center text-[11.5px] leading-relaxed text-faint">
                  To enable real accounts, set SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY on the API host.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-muted">Email</span>
                  <input
                    className="h-10 w-full rounded-md border border-border-2 bg-bg-soft px-3 text-[13px] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between text-[11.5px] font-medium text-muted">
                    Password
                    {!isSignup ? (
                      <span className="font-normal text-faint">8+ characters</span>
                    ) : null}
                  </span>
                  <span className="relative block">
                    <input
                      className="h-10 w-full rounded-md border border-border-2 bg-bg-soft px-3 pr-10 text-[13px] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      required
                      minLength={isSignup ? 8 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-faint transition-colors hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                {error ? (
                  <div className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--bad)_28%,transparent)] bg-[color-mix(in_srgb,var(--bad)_9%,transparent)] px-3 py-2.5 text-[12px] text-bad">
                    <CircleAlert className="mt-px size-3.5 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "mt-1 inline-flex h-10.5 w-full items-center justify-center gap-2 rounded-md bg-accent text-[13px] font-semibold text-accent-ink transition-[background,transform] hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--ink))] active:translate-y-px disabled:opacity-60"
                  )}
                >
                  {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
                  {!busy ? <ArrowRight className="size-4" /> : null}
                </button>
              </form>
            )}

            <div className="mt-6 flex justify-center gap-1.5 text-[12.5px] text-faint">
              <span>{isSignup ? "Already have an account?" : "New to SourceLens?"}</span>
              <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent hover:underline">
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-border pt-6 text-[11px] text-faint">
              <Lock className="size-3.5 shrink-0" />
              Protected by Supabase Auth · Your data stays in your project
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
