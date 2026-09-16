import Link from "next/link";
import ApiKeyManager from "@/components/app/ApiKeyManager";
import { Card, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listApiKeys, listConnections } from "@/lib/store";

export default async function ApiKeysPage() {
  const user = await requireUser();
  const keys = listApiKeys(user.id);
  const connections = listConnections(user.id);
  const sample = keys[0]?.key ?? "ac_live_xxx";
  const connectorList = [...new Set(connections.map((c) => c.connector))].slice(0, 3).join(",");

  return (
    <div className="p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">API keys</h1>
        <p className="mt-1 text-sm text-ink-500">
          One endpoint across every connected source.{" "}
          <Link href="/docs" className="font-medium text-brand-600 hover:text-brand-700">
            Read the docs
          </Link>
          .
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <ApiKeyManager keys={keys} />

        <Card>
          <CardHeader title="Try it" subtitle="These examples use your first key and connected sources." />
          <div className="space-y-4 p-5">
            <Example
              title="Blended daily performance"
              code={
                "curl \"http://localhost:3000/api/v1/all?api_key=" +
                sample +
                "&date_preset=last_30d&fields=date,source,spend,clicks,conversions,revenue,roas\""
              }
            />
            <Example
              title="One source, campaign level, CSV"
              code={
                "curl \"http://localhost:3000/api/v1/all?api_key=" +
                sample +
                (connectorList ? "&connector=" + connectorList.split(",")[0] : "") +
                "&fields=date,campaign,spend,conversions&format=csv\""
              }
            />
            <Example
              title="Data-driven attribution"
              code={
                "curl \"http://localhost:3000/api/v1/attribution?api_key=" +
                sample +
                "&model=markov&date_preset=last_30d\""
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Example({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-500">{title}</p>
      <pre className="overflow-x-auto rounded-lg bg-ink-900 px-4 py-3 text-[12px] leading-relaxed text-white/90 scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}
