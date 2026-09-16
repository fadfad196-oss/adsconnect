import DataExplorer from "@/components/app/DataExplorer";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { fieldsFor } from "@/lib/metrics";
import { listApiKeys, listConnections } from "@/lib/store";

export default async function DataExplorerPage() {
  const user = await requireUser();
  const connections = listConnections(user.id);
  const slugs = [...new Set(connections.map((c) => c.connector))];
  const { dimensions, metrics } = fieldsFor(slugs);
  const apiKey = listApiKeys(user.id)[0]?.key ?? "ac_live_xxx";

  return (
    <div className="p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Data explorer</h1>
        <p className="mt-1 text-sm text-ink-500">
          Query across every connected source. The same query is one URL away on the API.
        </p>
      </header>

      <div className="mt-6">
        {slugs.length ? (
          <DataExplorer connectedSlugs={slugs} dimensions={dimensions} metrics={metrics} apiKey={apiKey} />
        ) : (
          <EmptyState
            title="Nothing to query yet"
            body="Connect a source and the explorer fills in with its fields."
            action={<ButtonLink href="/app/connectors">Connect a source</ButtonLink>}
          />
        )}
      </div>
    </div>
  );
}
