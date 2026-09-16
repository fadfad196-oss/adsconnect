import Link from "next/link";
import { notFound } from "next/navigation";
import ConnectFlow from "@/components/app/ConnectFlow";
import { requireUser } from "@/lib/auth";
import { CONNECTORS_BY_SLUG } from "@/lib/catalog";
import { formatCurrency } from "@/lib/format";
import { generateRows, resolveRange, totals } from "@/lib/metrics";
import { listConnections } from "@/lib/store";

/** The account picker mirrors what the platform API would return after OAuth. */
function candidateAccounts(slug: string, company: string) {
  const { from, to } = resolveRange("last_30d");
  const spend = Number(totals(generateRows({ connectors: [slug], from, to }), ["spend"]).spend);
  const base = Math.abs(hash(slug)) % 8999999 + 1000000;

  return [
    { id: "act_" + base, name: company, currency: "USD", spend30d: formatCurrency(spend) },
    { id: "act_" + (base + 17), name: company + " - EU", currency: "EUR", spend30d: formatCurrency(spend * 0.42) },
    { id: "act_" + (base + 39), name: company + " - Retail", currency: "USD", spend30d: formatCurrency(spend * 0.18) },
  ];
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

export default async function ConnectPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const connector = CONNECTORS_BY_SLUG[slug];
  if (!connector) notFound();

  const connections = listConnections(user.id);

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
          accounts={candidateAccounts(connector.slug, user.company)}
          alreadyConnected={connections.some((c) => c.connector === connector.slug)}
        />
      </div>
    </div>
  );
}
