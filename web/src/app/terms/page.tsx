import type { Metadata } from "next";
import { TermsPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Plain-language terms of use for the SourceLens software and optional hosted service.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TermsPage />;
}
