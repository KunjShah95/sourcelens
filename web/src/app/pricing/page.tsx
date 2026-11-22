import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "SourceLens is free and MIT licensed to self-host. Optional managed Cloud hosting starts at $19/month with no event caps or feature gates.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
