import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { generateRows, type Row } from "./metrics";
import { providerForConnector, withFreshAuth, ProviderError, type ProviderAuth } from "./providers";
import { decryptJson, encryptJson } from "./secrets";
import { markConnectionError, saveConnectionCredentials, type Connection } from "./store";

const CACHE_DIR = path.join(process.env.ADSCONNECT_DATA_DIR || path.join(process.cwd(), ".data"), "cache");

const TTL_MS: Record<Connection["frequency"], number> = {
  hourly: 60 * 60 * 1000,
  daily: 6 * 60 * 60 * 1000,
  weekly: 24 * 60 * 60 * 1000,
};

export type Granularity = "campaign" | "adgroup" | "ad";

export interface SourceResult {
  rows: Row[];
  /** Connections that could not be read, with the reason to show the user. */
  errors: { connectionId: string; connector: string; message: string; reauthorize: boolean }[];
  /** True when at least one row came from a live platform API. */
  live: boolean;
}

function cachePath(connectionId: string, from: string, to: string, granularity: string): string {
  const key = crypto
    .createHash("sha256")
    .update([connectionId, from, to, granularity].join("|"))
    .digest("hex")
    .slice(0, 24);
  return path.join(CACHE_DIR, connectionId, key + ".json");
}

function readCache(file: string, ttl: number): Row[] | undefined {
  try {
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > ttl) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf8")) as Row[];
  } catch {
    return undefined;
  }
}

function writeCache(file: string, rows: Row[]) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(rows));
  } catch {
    // A read-only disk just means every request goes upstream.
  }
}

/** Drops cached rows so the next read goes to the platform. Used by "Sync now". */
export function invalidateCache(connectionId: string) {
  try {
    fs.rmSync(path.join(CACHE_DIR, connectionId), { recursive: true, force: true });
  } catch {
    // Nothing cached is the same outcome as a cleared cache.
  }
}

export function connectionAuth(connection: Connection): ProviderAuth | undefined {
  return decryptJson<ProviderAuth>(connection.credentials);
}

/** True when this connection is wired to a real platform account. */
export function isLive(connection: Connection): boolean {
  if (connection.mode !== "live" || !connection.credentials) return false;
  const provider = providerForConnector(connection.connector);
  return Boolean(provider?.isConfigured());
}

async function fetchLiveRows(
  connection: Connection,
  from: string,
  to: string,
  granularity: Granularity,
): Promise<Row[]> {
  const provider = providerForConnector(connection.connector);
  if (!provider) throw new ProviderError(connection.connector, "No live provider for this connector.", 501);

  const stored = connectionAuth(connection);
  if (!stored) {
    throw new ProviderError(provider.slug, "Stored credentials could not be read. Reconnect the account.", 401, true);
  }

  const auth = await withFreshAuth(provider, stored, (next) =>
    saveConnectionCredentials(connection.id, encryptJson(next)),
  );

  return provider.fetchRows(
    {
      ...auth,
      extra: { ...auth.extra, accountName: connection.accountName, connector: connection.connector },
    },
    {
      accountId: connection.accountId,
      from,
      to,
      granularity,
      currency: connection.currency,
    },
  );
}

/**
 * The single place rows come from. Live connections hit the platform (through a
 * short cache); everything else falls back to the seeded sample generator, so a
 * workspace is never empty while approvals are pending.
 */
export async function rowsForConnections(
  connections: Connection[],
  from: string,
  to: string,
  granularity: Granularity = "campaign",
): Promise<SourceResult> {
  const active = connections.filter((c) => c.status !== "paused");
  const live = active.filter((c) => isLive(c));
  const sample = active.filter((c) => !isLive(c));

  const result: SourceResult = { rows: [], errors: [], live: false };

  if (sample.length) {
    result.rows.push(
      ...generateRows({
        connectors: sample.map((c) => c.connector),
        accounts: Object.fromEntries(sample.map((c) => [c.connector, { id: c.accountId, name: c.accountName }])),
        from,
        to,
        granularity,
      }),
    );
  }

  // Platforms are independent, so one slow API should not serialise the others.
  const fetched = await Promise.all(
    live.map(async (connection) => {
      const file = cachePath(connection.id, from, to, granularity);
      const cached = readCache(file, TTL_MS[connection.frequency] ?? TTL_MS.daily);
      if (cached) return { connection, rows: cached };

      try {
        const rows = await fetchLiveRows(connection, from, to, granularity);
        writeCache(file, rows);
        markConnectionError(connection.id, null);
        return { connection, rows };
      } catch (error) {
        const providerError = error as ProviderError;
        const message = providerError.message ?? "Could not read this source.";
        markConnectionError(connection.id, message);
        return {
          connection,
          rows: [],
          error: {
            connectionId: connection.id,
            connector: connection.connector,
            message,
            reauthorize: Boolean(providerError.reauthorize),
          },
        };
      }
    }),
  );

  for (const entry of fetched) {
    if (entry.error) result.errors.push(entry.error);
    if (entry.rows.length) {
      result.rows.push(...entry.rows);
      result.live = true;
    }
  }

  return result;
}
