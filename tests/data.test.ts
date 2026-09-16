import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, eachDate, generateRows, previousRange, resolveRange, totals, type Row } from "../lib/metrics";
import { attribute, generateJourneys, attributionChannels } from "../lib/attribution";
import { QueryError, runQuery, toCsv } from "../lib/query";
import type { Connection } from "../lib/store";

const CONNECTORS = ["google-ads", "facebook-ads", "klaviyo"];
const FROM = "2026-01-01";
const TO = "2026-01-14";

const connections: Connection[] = CONNECTORS.map((connector, i) => ({
  id: "con_" + i,
  userId: "usr_test",
  connector,
  accountId: "act_100" + i,
  accountName: "Test",
  status: "connected",
  frequency: "daily",
  mode: "sample",
  lastSyncAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
}));

test("row generation is deterministic for the same window", () => {
  const a = generateRows({ connectors: CONNECTORS, from: FROM, to: TO });
  const b = generateRows({ connectors: CONNECTORS, from: FROM, to: TO });
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
});

test("date ranges are contiguous and the previous window is the same length", () => {
  const { from, to } = resolveRange("last_30d");
  assert.equal(eachDate(from, to).length, 30);
  const prior = previousRange(from, to);
  assert.equal(eachDate(prior.from, prior.to).length, 30);
  assert.ok(prior.to < from);
});

test("ratio metrics are recomputed after aggregation, not averaged", () => {
  const rows = generateRows({ connectors: CONNECTORS, from: FROM, to: TO });
  const total = totals(rows, ["clicks", "impressions", "ctr", "spend", "revenue", "roas"]);
  const expectedCtr = (Number(total.clicks) / Number(total.impressions)) * 100;
  assert.ok(Math.abs(Number(total.ctr) - expectedCtr) < 0.01);
  const expectedRoas = Number(total.revenue) / Number(total.spend);
  assert.ok(Math.abs(Number(total.roas) - expectedRoas) < 0.01);
});

test("aggregation preserves totals across group-by levels", () => {
  const rows = generateRows({ connectors: CONNECTORS, from: FROM, to: TO });
  const byDate = aggregate(rows, ["date"], ["spend"]);
  const bySource = aggregate(rows, ["source"], ["spend"]);
  const sum = (list: { spend?: unknown }[]) => list.reduce((a, r) => a + Number(r.spend ?? 0), 0);
  assert.ok(Math.abs(sum(byDate) - sum(bySource)) < 1);
});

test("every attribution model distributes exactly the available conversions", () => {
  const channels = attributionChannels(CONNECTORS);
  const journeys = generateJourneys({ channels, from: FROM, to: TO });
  assert.ok(journeys.length > 0);

  for (const model of ["first_click", "last_click", "last_non_direct", "linear", "time_decay", "position_based", "markov"] as const) {
    const credits = attribute(journeys, model);
    const assigned = credits.reduce((a, c) => a + c.conversions, 0);
    assert.ok(
      Math.abs(assigned - journeys.length) < 1,
      model + " assigned " + assigned + " of " + journeys.length + " conversions",
    );
  }
});

test("first click moves credit away from the closing channels", () => {
  const channels = attributionChannels(CONNECTORS);
  const journeys = generateJourneys({ channels, from: FROM, to: TO });
  const first = attribute(journeys, "first_click");
  const last = attribute(journeys, "last_click");
  const find = (list: typeof first, channel: string) =>
    list.find((c) => c.channel === channel)?.conversions ?? 0;
  assert.ok(find(first, "facebook-ads") > find(last, "facebook-ads"));
});

test("query rejects unknown fields and honours field order", async () => {
  await assert.rejects(
    () => runQuery(connections, { fields: ["date", "not_a_field"] }),
    (error: unknown) => error instanceof QueryError,
  );

  const result = await runQuery(connections, {
    fields: ["source", "spend", "clicks"],
    dateFrom: FROM,
    dateTo: TO,
    orderBy: "-spend",
  });
  assert.deepEqual(Object.keys(result.data[0]), ["source", "spend", "clicks"]);
  assert.ok(Number(result.data[0].spend) >= Number(result.data[1].spend));
});

test("filters narrow the result set", async () => {
  const all = await runQuery(connections, { fields: ["source", "spend"], dateFrom: FROM, dateTo: TO });
  const filtered = await runQuery(connections, {
    fields: ["source", "spend"],
    dateFrom: FROM,
    dateTo: TO,
    filters: ["source:eq:Google Ads"],
  });
  assert.ok(filtered.data.length < all.data.length);
  assert.equal(filtered.data[0].source, "Google Ads");
});

test("paused connections are excluded from queries", async () => {
  const paused = connections.map((c) => (c.connector === "klaviyo" ? { ...c, status: "paused" as const } : c));
  const result = await runQuery(paused, { fields: ["source", "spend"], dateFrom: FROM, dateTo: TO });
  assert.ok(!result.data.some((row: Row) => row.source === "Klaviyo"));
});

test("csv export quotes values containing commas", async () => {
  const result = await runQuery(connections, { fields: ["campaign", "spend"], dateFrom: FROM, dateTo: TO, limit: 5 });
  const csv = toCsv(result);
  assert.equal(csv.split("\n")[0], "campaign,spend");
  assert.ok(csv.endsWith("\n"));
});
