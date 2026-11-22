import type { Metadata } from "next";
import { PrivacyPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "SourceLens privacy policy: no cookies, no IP storage, Do Not Track respected and your analytics data stays in your own database.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyPage />;
}
