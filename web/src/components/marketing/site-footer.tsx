import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "./marketing-ui";

const COLUMNS = [
  { title: "Product", links: siteConfig.footer.product },
  { title: "Resources", links: siteConfig.footer.resources },
  { title: "Company", links: siteConfig.footer.company },
  { title: "Legal", links: siteConfig.footer.legal },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-soft">
      <div className="mx-auto max-w-360 px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="flex flex-col items-start gap-4">
            <Logo />
            <p className="max-w-72 text-[12.5px] leading-relaxed text-muted">
              Traffic-source intelligence you own. See where every visit comes from, then make yourself easier to find — by people and by models.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-2.5 py-1 font-mono text-[10.5px] text-faint">
              <span className="size-1.5 rounded-full bg-ok" />
              AI crawlers welcome
              <ArrowUpRight className="size-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="mb-3.5 text-[11px] font-medium tracking-[0.09em] text-faint uppercase">{column.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className="text-[12.5px] text-muted transition-colors hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-[11.5px] text-faint">
          <span>© {new Date().getFullYear()} {siteConfig.name}. MIT licensed.</span>
          <span className="inline-flex items-center gap-1.5">
            Built for the open web <Heart className="size-3 fill-current text-accent" />
          </span>
          <span className="font-mono">No cookies. No IP storage. No nonsense.</span>
        </div>
      </div>
    </footer>
  );
}
