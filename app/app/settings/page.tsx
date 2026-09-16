import SettingsForm from "@/components/app/SettingsForm";
import { Card, CardHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listApiKeys, listConnections, listDestinations } from "@/lib/store";

export default async function SettingsPage() {
  const user = await requireUser();
  const connections = listConnections(user.id);
  const pipelines = listDestinations(user.id);
  const keys = listApiKeys(user.id);

  return (
    <div className="p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Workspace, plan and usage.</p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Workspace" subtitle={user.email} />
          <div className="p-5">
            <SettingsForm name={user.name} company={user.company} plan={user.plan} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Usage" />
            <ul className="divide-y divide-ink-200 text-sm">
              <Usage label="Connected sources" value={connections.length} />
              <Usage label="Active pipelines" value={pipelines.filter((p) => p.status === "active").length} />
              <Usage label="API keys" value={keys.length} />
              <Usage
                label="Hourly refresh sources"
                value={connections.filter((c) => c.frequency === "hourly").length}
              />
            </ul>
          </Card>

          <Card>
            <CardHeader title="Data retention" />
            <div className="space-y-3 p-5 text-sm text-ink-500">
              <p>
                Rows are kept for the life of the connection. Disconnecting a source stops new syncs and keeps
                what has already landed, so your history survives.
              </p>
              <p>
                This build stores workspace state in a local JSON file under{" "}
                <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">.data/db.json</code>{" "}
                and generates metrics deterministically, so nothing leaves the machine.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Usage({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between px-5 py-3">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium tabular-nums text-ink-900">{value}</span>
    </li>
  );
}
