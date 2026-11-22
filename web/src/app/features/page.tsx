import type { Metadata } from "next";
import { FeaturesPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore SourceLens features: eight-channel source attribution, 16 AI assistant detectors, SEO/AEO/GEO audits, AI crawler intelligence and llms.txt generation.",
  alternates: { canonical: "/features" },
};

export default function Page() {
  return <FeaturesPage />;
}
