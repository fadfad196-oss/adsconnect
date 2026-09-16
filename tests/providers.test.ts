import assert from "node:assert/strict";
import test from "node:test";
import { decryptJson, encryptJson, maskToken, signState, verifyState } from "../lib/secrets";
import { providerForConnector, providerStatus, PROVIDERS } from "../lib/providers";
import { mapGoogleAdsRow } from "../lib/providers/google-ads";
import { mapMetaInsight } from "../lib/providers/meta";
import { mapTikTokRow } from "../lib/providers/tiktok";
import { mapLinkedInElement } from "../lib/providers/linkedin";
import { mapAdformReport } from "../lib/providers/adform";
import { mapGa4Report } from "../lib/providers/ga4";
import { rowsForConnections } from "../lib/sources";
import type { Connection } from "../lib/store";

const ACCOUNT = { id: "123", name: "Acme" };

/* ------------------------------------------------------------- credentials */

test("credentials survive an encrypt and decrypt round trip", () => {
  const auth = { accessToken: "token-value", refreshToken: "refresh-value", expiresAt: 1234 };
  const blob = encryptJson(auth);
  assert.ok(!blob.includes("token-value"), "ciphertext must not contain the token");
  assert.deepEqual(decryptJson(blob), auth);
});

test("a tampered credential blob decrypts to nothing rather than throwing", () => {
  const blob = encryptJson({ accessToken: "abc" });
  const [iv, tag, payload] = blob.split(".");
  const flipped = payload.slice(0, -2) + (payload.endsWith("A") ? "BB" : "AA");
  assert.equal(decryptJson([iv, tag, flipped].join(".")), undefined);
  assert.equal(decryptJson("not-a-blob"), undefined);
  assert.equal(decryptJson(undefined), undefined);
});

test("rotating APP_SECRET invalidates stored credentials", () => {
  const previous = process.env.APP_SECRET;
  process.env.APP_SECRET = "first-secret-value";
  const blob = encryptJson({ accessToken: "abc" });
  process.env.APP_SECRET = "second-secret-value";
  assert.equal(decryptJson(blob), undefined);
  process.env.APP_SECRET = previous;
});

test("oauth state is signed, scoped and expiring", () => {
  const state = signState({ userId: "usr_1", provider: "meta-ads", connector: "facebook-ads" });
  const parsed = verifyState<{ userId: string; connector: string }>(state);
  assert.equal(parsed?.userId, "usr_1");
  assert.equal(parsed?.connector, "facebook-ads");

  const [body] = state.split(".");
  assert.equal(verifyState(body + ".forged-signature"), undefined);
  assert.equal(verifyState(signState({ userId: "usr_1" }, -1)), undefined, "expired state must be rejected");
});

test("tokens are masked before they reach a UI or a log line", () => {
  assert.equal(maskToken("abcdefghijklmnop"), "abcd…mnop");
  assert.equal(maskToken("short"), "••••");
});

/* ---------------------------------------------------------------- registry */

test("every provider is reachable from its connector slugs", () => {
  for (const provider of PROVIDERS) {
    for (const connector of provider.connectors) {
      assert.equal(providerForConnector(connector)?.slug, provider.slug);
    }
  }
  assert.equal(providerForConnector("facebook-ads")?.slug, "meta-ads");
  assert.equal(providerForConnector("instagram-ads")?.slug, "meta-ads");
  assert.equal(providerForConnector("klaviyo"), undefined);
});

test("provider status reports what is missing instead of failing", () => {
  const status = providerStatus("linkedin-ads");
  assert.equal(status.supported, true);
  if (!status.supported) return;
  if (!status.configured) {
    assert.ok(status.missingEnv.length > 0);
    assert.ok(status.missingEnv.every((name) => status.provider.requiredEnv.includes(name)));
  }
  assert.equal(providerStatus("klaviyo").supported, false);
});

/* ----------------------------------------------------------------- mappers */

test("google ads cost micros become currency", () => {
  const row = mapGoogleAdsRow(
    {
      segments: { date: "2026-09-01", device: "MOBILE" },
      campaign: { id: "9", name: "Brand" },
      metrics: {
        impressions: "1000",
        clicks: "120",
        costMicros: "12340000",
        conversions: "4.5",
        conversionsValue: "900.5",
      },
    },
    ACCOUNT,
  );
  assert.equal(row.spend, 12.34);
  assert.equal(row.clicks, 120);
  assert.equal(row.conversions, 4.5);
  assert.equal(row.revenue, 900.5);
  assert.equal(row.device, "mobile");
  assert.equal(row.source, "Google Ads");
});

test("meta insights pick the purchase action and fall back to leads", () => {
  const purchase = mapMetaInsight(
    {
      date_start: "2026-09-01",
      campaign_name: "Prospecting",
      impressions: "5000",
      clicks: "200",
      spend: "150.25",
      actions: [
        { action_type: "landing_page_view", value: "180" },
        { action_type: "offsite_conversion.fb_pixel_purchase", value: "12" },
      ],
      action_values: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "1440.60" }],
    },
    ACCOUNT,
    "facebook-ads",
  );
  assert.equal(purchase.conversions, 12);
  assert.equal(purchase.revenue, 1440.6);
  assert.equal(purchase.spend, 150.25);

  const leadOnly = mapMetaInsight(
    { date_start: "2026-09-01", actions: [{ action_type: "lead", value: "7" }] },
    ACCOUNT,
    "instagram-ads",
  );
  assert.equal(leadOnly.conversions, 7);
  assert.equal(leadOnly.source, "Instagram Ads");

  const noActions = mapMetaInsight({ date_start: "2026-09-01" }, ACCOUNT, "facebook-ads");
  assert.equal(noActions.conversions, 0);
  assert.equal(noActions.revenue, 0);
});

test("tiktok rows normalise the day stamp and keep revenue opt-in", () => {
  const item = {
    dimensions: { campaign_id: "77", stat_time_day: "2026-09-01 00:00:00" },
    metrics: { campaign_name: "Reels push", spend: "80.5", impressions: "9000", clicks: "300", conversion: "9" },
  };
  const withoutRevenue = mapTikTokRow(item, ACCOUNT);
  assert.equal(withoutRevenue.date, "2026-09-01");
  assert.equal(withoutRevenue.campaign, "Reels push");
  assert.equal(withoutRevenue.revenue, 0);

  const withRevenue = mapTikTokRow(
    { ...item, metrics: { ...item.metrics, purchase_value: "412.30" } },
    ACCOUNT,
    "purchase_value",
  );
  assert.equal(withRevenue.revenue, 412.3);
});

test("linkedin urns and split dates are reassembled", () => {
  const row = mapLinkedInElement(
    {
      impressions: 4000,
      clicks: 60,
      costInLocalCurrency: "420.10",
      externalWebsiteConversions: 5,
      dateRange: { start: { year: 2026, month: 9, day: 3 } },
      pivotValues: ["urn:li:sponsoredCampaign:99887"],
    },
    ACCOUNT,
    { "99887": "Lead gen | Whitepaper" },
  );
  assert.equal(row.date, "2026-09-03");
  assert.equal(row.campaign_id, "99887");
  assert.equal(row.campaign, "Lead gen | Whitepaper");
  assert.equal(row.spend, 420.1);

  const unnamed = mapLinkedInElement(
    { dateRange: { start: { year: 2026, month: 12, day: 25 } }, pivotValues: ["urn:li:sponsoredCampaign:1"] },
    ACCOUNT,
  );
  assert.equal(unnamed.date, "2026-12-25");
  assert.equal(unnamed.campaign, "Campaign 1");
});

test("adform columns are mapped by header position, in any order", () => {
  const rows = mapAdformReport(
    {
      reportData: {
        columnHeaders: ["campaign", "date", "clicks", "impressions", "cost", "conversions", "sales"],
        rows: [["Display | Q4", "2026-09-01", 42, 10000, 260.5, 3, 780]],
      },
    },
    ACCOUNT,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].campaign, "Display | Q4");
  assert.equal(rows[0].date, "2026-09-01");
  assert.equal(rows[0].clicks, 42);
  assert.equal(rows[0].spend, 260.5);
  assert.equal(rows[0].revenue, 780);
});

test("ga4 compact dates become ISO dates", () => {
  const rows = mapGa4Report(
    {
      dimensionHeaders: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }, { name: "sessionCampaignName" }],
      metricHeaders: [{ name: "sessions" }, { name: "keyEvents" }, { name: "totalRevenue" }],
      rows: [
        {
          dimensionValues: [{ value: "20260901" }, { value: "Paid Search" }, { value: "brand" }],
          metricValues: [{ value: "1200" }, { value: "36" }, { value: "4210.25" }],
        },
      ],
    },
    ACCOUNT,
    "keyEvents",
  );
  assert.equal(rows[0].date, "2026-09-01");
  assert.equal(rows[0].sessions, 1200);
  assert.equal(rows[0].conversions, 36);
  assert.equal(rows[0].revenue, 4210.25);
  assert.equal(rows[0].medium, "Paid Search");
});

/* ------------------------------------------------------------ source routing */

const sampleConnection: Connection = {
  id: "con_sample",
  userId: "usr_test",
  connector: "google-ads",
  accountId: "act_1",
  accountName: "Test",
  status: "connected",
  frequency: "daily",
  mode: "sample",
  lastSyncAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("connections without credentials serve sample rows and never call out", async () => {
  const result = await rowsForConnections([sampleConnection], "2026-01-01", "2026-01-07");
  assert.ok(result.rows.length > 0);
  assert.equal(result.live, false);
  assert.equal(result.errors.length, 0);
});

test("a connection marked live but missing credentials is not treated as live", async () => {
  const result = await rowsForConnections(
    [{ ...sampleConnection, mode: "live" }],
    "2026-01-01",
    "2026-01-07",
  );
  // Falls back to sample data rather than erroring the whole dashboard.
  assert.ok(result.rows.length > 0);
  assert.equal(result.live, false);
});

test("paused connections contribute nothing at all", async () => {
  const result = await rowsForConnections(
    [{ ...sampleConnection, status: "paused" }],
    "2026-01-01",
    "2026-01-07",
  );
  assert.equal(result.rows.length, 0);
});
