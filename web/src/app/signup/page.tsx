import type { Metadata } from "next";
import { AuthPage } from "@/components/marketing/auth-page";

export const metadata: Metadata = {
  title: "Create your workspace",
  description: "Start tracking traffic sources for free. Self-host SourceLens on your own Supabase project in minutes.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
