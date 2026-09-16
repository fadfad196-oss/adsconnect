import type { Metadata } from "next";
import ConnectorBrowser from "@/components/marketing/ConnectorBrowser";
import { ButtonLink } from "@/components/ui";
import { CONNECTORS, TOTAL_SOURCE_COUNT } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Data sources",
  description:
    "Browse every marketing, analytics, e-commerce, CRM and email data source AdsConnect can pull into your reporting.",
};

export default async function ConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Data sources</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900">
          {TOTAL_SOURCE_COUNT}+ sources, one consistent schema
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500">
          Every connector returns the same core fields, so spend, clicks and conversions mean the same thing
          whether they came from Google Ads, TikTok or your email platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Connect your first source</ButtonLink>
          <ButtonLink href="/destinations" variant="secondary">
            See destinations
          </ButtonLink>
        </div>
      </div>

      <div className="mt-12">
        <ConnectorBrowser connectors={CONNECTORS} initialCategory={category} />
      </div>
    </div>
  );
}
