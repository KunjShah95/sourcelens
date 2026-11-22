import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why SourceLens exists: analytics should reveal where traffic really comes from, including AI assistants, while respecting visitor privacy and your data ownership.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <AboutPage />;
}
