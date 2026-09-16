import Link from "next/link";
import { notFound } from "next/navigation";
import ConnectFlow, { type ProviderInfo } from "@/components/app/ConnectFlow";
import { requireUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { formatCurrency } from "@/lib/format";
import { generateRows, resolveRange, totals } from "@/lib/metrics";
import { providerStatus } from "@/lib/providers";
import { listConnections } from "@/lib/store";

/** Sample accounts mirror the shape a platform would return after OAuth. */
function sampleAccounts(slug: string, company: string) {
  const { from, to } = resolveRange("last_30d");
  const spend = Number(totals(generateRows({ connectors: [slug], from, to }), ["spend"]).spend);
  const base = (Math.abs(hash(slug)) % 8999999) + 1000000;

  return [
    { id: "act_" + base, name: company, currency: "USD", detail: formatCurrency(spend) + " last 30d" },
    { id: "act_" + (base + 17), name: company + " - EU", currency: "EUR", detail: formatCurrency(spend * 0.42) + " last 30d" },
    { id: "act_" + (base + 39), name: company + " - Retail", currency: "USD", detail: formatCurrency(spend * 0.18) + " last 30d" },
  ];
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

export default async function ConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ auth?: string; error?: string; setup?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const { auth, error, setup } = await searchParams;
  const connector = CONNECTORS_BY_SLUG[slug];
  if (!connector) notFound();

  const connections = listConnections(user.id);
  const status = providerStatus(connector.slug);

  const provider: ProviderInfo | null = status.supported
    ? {
        slug: status.provider.slug,
        label: status.provider.label,
        kind: status.provider.kind,
        configured: status.configured,
        missingEnv: status.missingEnv,
        requiredEnv: status.provider.requiredEnv,
        docsUrl: status.provider.docsUrl,
        accessNote: status.provider.accessNote,
      }
    : null;

  return (
    <div className="p-6 lg:p-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-400">
        <Link href="/app/connectors" className="hover:text-brand-600">
          Data sources
        </Link>
        <span>/</span>
        <span className="text-ink-700">{connector.name}</span>
      </nav>

      <div className="max-w-3xl">
        <ConnectFlow
          connector={connector}
          provider={provider}
          sampleAccounts={sampleAccounts(connector.slug, user.company)}
          alreadyConnected={connections.some((c) => c.connector === connector.slug)}
          authId={auth}
          initialError={error}
          showSetup={Boolean(setup)}
        />
      </div>
    </div>
  );
}
