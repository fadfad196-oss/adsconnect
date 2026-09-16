import ConnectionList from "@/components/app/ConnectionList";
import ConnectorBrowser from "@/components/marketing/ConnectorBrowser";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CONNECTORS } from "@/lib/catalog";
import { listConnections } from "@/lib/store";

export default async function AppConnectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const connections = listConnections(user.id);

  return (
    <div className="p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Data sources</h1>
        <p className="mt-1 text-sm text-ink-500">
          Connected accounts sync on their own schedule. Add as many as you report on.
        </p>
      </header>

      {welcome ? (
        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-brand-800">Welcome to AdsConnect</h2>
          <p className="mt-1 text-sm text-brand-700">
            We pre-connected a few sources so you have something to look at. Connect your own accounts below,
            then build a pipeline under Pipelines.
          </p>
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader
          title={"Connected sources (" + connections.length + ")"}
          subtitle="Pause a source to keep the history but stop new syncs."
        />
        {connections.length ? (
          <ConnectionList connections={connections} />
        ) : (
          <div className="p-5">
            <EmptyState
              title="Nothing connected yet"
              body="Pick a platform below to run through the connect flow."
            />
          </div>
        )}
      </Card>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink-900">Add a source</h2>
        <p className="mt-1 text-sm text-ink-500">Search the catalogue and connect in a couple of steps.</p>
        <div className="mt-5">
          <ConnectorBrowser
            connectors={CONNECTORS}
            hrefBase="/app/connectors/"
            cta="Connect"
            connectedSlugs={connections.map((c) => c.connector)}
          />
        </div>
      </section>
    </div>
  );
}
