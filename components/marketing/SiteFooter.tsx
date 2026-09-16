import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { CONNECTORS, DESTINATIONS } from "@/lib/catalog";

const POPULAR = CONNECTORS.filter((c) => c.popular).slice(0, 8);

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-[17px] font-semibold tracking-tight text-ink-900">AdsConnect</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
              Marketing data pipelines and multi-touch attribution, without the engineering ticket.
            </p>
            <p className="mt-6 text-xs text-ink-400">
              © {new Date().getFullYear()} AdsConnect. Product names and logos of connected platforms belong
              to their respective owners.
            </p>
          </div>

          <FooterColumn title="Data sources">
            {POPULAR.map((connector) => (
              <FooterLink key={connector.slug} href={"/connectors/" + connector.slug}>
                {connector.name}
              </FooterLink>
            ))}
            <FooterLink href="/connectors">All sources</FooterLink>
          </FooterColumn>

          <FooterColumn title="Destinations">
            {DESTINATIONS.slice(0, 8).map((destination) => (
              <FooterLink key={destination.slug} href={"/destinations/" + destination.slug}>
                {destination.name}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Product">
            <FooterLink href="/attribution">Attribution</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
            <FooterLink href="/docs">API documentation</FooterLink>
            <FooterLink href="/signup">Start free trial</FooterLink>
            <FooterLink href="/login">Log in</FooterLink>
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-900">{title}</h4>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-ink-500 transition-colors hover:text-brand-600">
        {children}
      </Link>
    </li>
  );
}
