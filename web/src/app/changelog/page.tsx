import type { Metadata } from "next";
import { ChangelogPage } from "@/components/marketing/feature-pages";

export const metadata: Metadata = {
  title: "Changelog",
  description: "A short, honest log of SourceLens releases, feature additions and attribution fixes.",
  alternates: { canonical: "/changelog" },
};

export default function Page() {
  return <ChangelogPage />;
}
