import type { Metadata } from "next";
import { AuthPage } from "@/components/marketing/auth-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SourceLens workspace to see where every visit comes from.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
