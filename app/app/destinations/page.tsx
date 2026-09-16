import PipelineManager from "@/components/app/PipelineManager";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listConnections, listDestinations } from "@/lib/store";

export default async function PipelinesPage() {
  const user = await requireUser();
  const connections = listConnections(user.id);
  const pipelines = listDestinations(user.id);

  return (
    <div className="p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Pipelines</h1>
        <p className="mt-1 text-sm text-ink-500">
          Deliver blended data to a dashboard, spreadsheet, warehouse or bucket on a schedule.
        </p>
      </header>

      <div className="mt-6">
        {connections.length ? (
          <PipelineManager
            pipelines={pipelines}
            connectedSlugs={[...new Set(connections.map((c) => c.connector))]}
          />
        ) : (
          <EmptyState
            title="Connect a source first"
            body="A pipeline needs at least one connected data source to deliver."
            action={<ButtonLink href="/app/connectors">Connect a source</ButtonLink>}
          />
        )}
      </div>
    </div>
  );
}
