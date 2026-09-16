import type { Row } from "../metrics";
import { request, round2, toNumber } from "./http";
import { googleAuthorizeUrl, googleClient, googleExchangeCode, googleRefresh } from "./google-oauth";
import {
  ProviderError,
  type AccountRef,
  type FetchParams,
  type Provider,
  type ProviderAuth,
} from "./types";

const SLUG = "google-analytics-4";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const ADMIN_API = "https://analyticsadmin.googleapis.com/v1beta";
const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

interface RunReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
}

interface AccountSummaries {
  accountSummaries?: {
    displayName?: string;
    propertySummaries?: { property?: string; displayName?: string }[];
  }[];
}

const DIMENSIONS = ["date", "sessionDefaultChannelGroup", "sessionSource", "sessionCampaignName"];

/**
 * GA4 renamed conversions to key events. Newer properties reject `conversions`
 * and older ones reject `keyEvents`, so we try the current name and fall back.
 */
const CONVERSION_METRICS = ["keyEvents", "conversions"];

/** Exported for tests: turns a runReport response into shared-schema rows. */
export function mapGa4Report(response: RunReportResponse, account: AccountRef, conversionMetric: string): Row[] {
  const dimensionNames = (response.dimensionHeaders ?? []).map((h) => h.name);
  const metricNames = (response.metricHeaders ?? []).map((h) => h.name);

  return (response.rows ?? []).map((row) => {
    const dims: Record<string, string> = {};
    dimensionNames.forEach((name, i) => {
      dims[name] = row.dimensionValues?.[i]?.value ?? "";
    });
    const metrics: Record<string, number> = {};
    metricNames.forEach((name, i) => {
      metrics[name] = toNumber(row.metricValues?.[i]?.value);
    });

    const raw = dims.date ?? "";
    const date = raw.length === 8 ? raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) : raw;

    return {
      date,
      source: "Google Analytics 4",
      connector: SLUG,
      account_id: account.id,
      account_name: account.name,
      campaign: dims.sessionCampaignName || "(not set)",
      campaign_id: "",
      adgroup: "All ad groups",
      ad: "All ads",
      device: "",
      country: "",
      medium: dims.sessionDefaultChannelGroup || "organic",
      channel_group: dims.sessionDefaultChannelGroup || "",
      impressions: 0,
      clicks: 0,
      spend: round2(metrics.advertiserAdCost ?? 0),
      conversions: round2(metrics[conversionMetric] ?? 0),
      revenue: round2(metrics.totalRevenue ?? 0),
      sessions: toNumber(metrics.sessions),
      engaged_sessions: toNumber(metrics.engagedSessions),
    } satisfies Row;
  });
}

export const ga4Provider: Provider = {
  slug: SLUG,
  label: "Google Analytics 4",
  kind: "oauth",
  connectors: [SLUG],
  requiredEnv: ["GOOGLE_ANALYTICS_CLIENT_ID", "GOOGLE_ANALYTICS_CLIENT_SECRET"],
  docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
  accessNote:
    "The only one of the six with no approval queue. Enable the Google Analytics Data API in a Google Cloud project and add the OAuth client.",
  scopes: SCOPES,

  isConfigured() {
    const { clientId, clientSecret } = googleClient(SLUG);
    return Boolean(clientId && clientSecret);
  },

  authorizeUrl(state, redirectUri) {
    return googleAuthorizeUrl(SLUG, state, redirectUri, SCOPES);
  },

  exchangeCode(code, redirectUri) {
    return googleExchangeCode(SLUG, code, redirectUri);
  },

  refresh(auth) {
    return googleRefresh(SLUG, auth);
  },

  async listAccounts(auth) {
    const summaries = await request<AccountSummaries>(SLUG, ADMIN_API + "/accountSummaries?pageSize=200", {
      headers: { authorization: "Bearer " + auth.accessToken },
    });

    const accounts: AccountRef[] = [];
    for (const summary of summaries.accountSummaries ?? []) {
      for (const property of summary.propertySummaries ?? []) {
        const id = (property.property ?? "").split("/")[1];
        if (!id) continue;
        accounts.push({
          id,
          name: (property.displayName ?? "Property " + id) + (summary.displayName ? " · " + summary.displayName : ""),
        });
      }
    }
    if (!accounts.length) {
      throw new ProviderError(SLUG, "No GA4 properties are visible to this Google account.", 404);
    }
    return accounts;
  },

  async fetchRows(auth, params: FetchParams) {
    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };

    for (const conversionMetric of CONVERSION_METRICS) {
      const body = {
        dateRanges: [{ startDate: params.from, endDate: params.to }],
        dimensions: DIMENSIONS.map((name) => ({ name })),
        metrics: [
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: conversionMetric },
          { name: "totalRevenue" },
        ],
        limit: "100000",
      };

      try {
        const response = await request<RunReportResponse>(
          SLUG,
          DATA_API + "/properties/" + params.accountId + ":runReport",
          { method: "POST", headers: { authorization: "Bearer " + auth.accessToken }, body },
        );
        return mapGa4Report(response, account, conversionMetric);
      } catch (error) {
        const message = (error as Error).message ?? "";
        const isMetricProblem = message.includes(conversionMetric) || message.includes("did not match");
        const hasFallback = conversionMetric !== CONVERSION_METRICS[CONVERSION_METRICS.length - 1];
        if (!isMetricProblem || !hasFallback) throw error;
      }
    }
    return [];
  },
};
