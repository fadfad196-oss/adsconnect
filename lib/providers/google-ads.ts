import type { Row } from "../metrics";
import { request, round2, toNumber } from "./http";
import { googleAuthorizeUrl, googleClient, googleExchangeCode, googleRefresh } from "./google-oauth";
import {
  ProviderError,
  env,
  requireEnv,
  type AccountRef,
  type FetchParams,
  type Provider,
  type ProviderAuth,
} from "./types";

const SLUG = "google-ads";
/** Pinned so a Google release cannot silently change field behaviour under us. */
const API_VERSION = env("GOOGLE_ADS_API_VERSION") ?? "v25";
const BASE = "https://googleads.googleapis.com/" + API_VERSION;
const SCOPES = ["https://www.googleapis.com/auth/adwords"];

interface SearchResult {
  results?: GoogleAdsRow[];
}

interface GoogleAdsRow {
  segments?: { date?: string; device?: string };
  customer?: { id?: string; descriptiveName?: string; currencyCode?: string };
  campaign?: { id?: string; name?: string };
  adGroup?: { id?: string; name?: string };
  metrics?: Record<string, string | number>;
}

function headers(auth: ProviderAuth): Record<string, string> {
  const head: Record<string, string> = {
    authorization: "Bearer " + auth.accessToken,
    "developer-token": requireEnv(SLUG, "GOOGLE_ADS_DEVELOPER_TOKEN"),
  };
  // Required whenever the account is reached through a manager (MCC) account.
  const login = auth.extra?.loginCustomerId ?? env("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  if (login) head["login-customer-id"] = login.replace(/-/g, "");
  return head;
}

async function search(auth: ProviderAuth, customerId: string, query: string): Promise<GoogleAdsRow[]> {
  const url = BASE + "/customers/" + customerId.replace(/-/g, "") + "/googleAds:searchStream";
  // searchStream answers with an array of chunks, each holding a results page.
  const chunks = await request<SearchResult[] | SearchResult>(SLUG, url, {
    method: "POST",
    headers: headers(auth),
    body: { query },
  });
  const list = Array.isArray(chunks) ? chunks : [chunks];
  return list.flatMap((chunk) => chunk.results ?? []);
}

/** Exported for tests: maps one Google Ads row onto the shared schema. */
export function mapGoogleAdsRow(row: GoogleAdsRow, account: AccountRef): Row {
  const metrics = row.metrics ?? {};
  const spend = round2(toNumber(metrics.costMicros) / 1_000_000);
  return {
    date: row.segments?.date ?? "",
    source: "Google Ads",
    connector: SLUG,
    account_id: account.id,
    account_name: account.name,
    campaign: row.campaign?.name ?? "(not set)",
    campaign_id: row.campaign?.id ?? "",
    adgroup: row.adGroup?.name ?? "All ad groups",
    ad: "All ads",
    device: (row.segments?.device ?? "unknown").toLowerCase(),
    country: "",
    medium: "cpc",
    impressions: toNumber(metrics.impressions),
    clicks: toNumber(metrics.clicks),
    spend,
    conversions: round2(toNumber(metrics.conversions)),
    revenue: round2(toNumber(metrics.conversionsValue)),
    sessions: toNumber(metrics.clicks),
  };
}

export const googleAdsProvider: Provider = {
  slug: SLUG,
  label: "Google Ads",
  kind: "oauth",
  connectors: [SLUG],
  requiredEnv: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"],
  docsUrl: "https://developers.google.com/google-ads/api/docs/start",
  accessNote:
    "Needs a developer token from a Google Ads manager account. A new token starts at test access and only reads test accounts until Google approves basic access.",
  scopes: SCOPES,

  isConfigured() {
    const { clientId, clientSecret } = googleClient(SLUG);
    return Boolean(clientId && clientSecret && env("GOOGLE_ADS_DEVELOPER_TOKEN"));
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
    const accessible = await request<{ resourceNames?: string[] }>(
      SLUG,
      BASE + "/customers:listAccessibleCustomers",
      { headers: headers(auth) },
    );
    const ids = (accessible.resourceNames ?? []).map((name) => name.split("/")[1]).filter(Boolean);
    if (!ids.length) {
      throw new ProviderError(SLUG, "This Google account has no accessible Google Ads customers.", 404);
    }

    const accounts: AccountRef[] = [];
    for (const id of ids.slice(0, 50)) {
      try {
        const rows = await search(
          auth,
          id,
          "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1",
        );
        const customer = rows[0]?.customer;
        accounts.push({
          id,
          name: customer?.descriptiveName || "Customer " + id,
          currency: customer?.currencyCode,
        });
      } catch {
        // A customer we cannot read (usually a manager account) is not a failure.
        accounts.push({ id, name: "Customer " + id });
      }
    }
    return accounts;
  },

  async fetchRows(auth, params: FetchParams) {
    const level = params.granularity === "campaign" ? "campaign" : "ad_group";
    const fields = [
      "segments.date",
      "segments.device",
      "campaign.id",
      "campaign.name",
      ...(level === "ad_group" ? ["ad_group.id", "ad_group.name"] : []),
      "metrics.impressions",
      "metrics.clicks",
      "metrics.cost_micros",
      "metrics.conversions",
      "metrics.conversions_value",
    ];
    const query =
      "SELECT " +
      fields.join(", ") +
      " FROM " +
      level +
      " WHERE segments.date BETWEEN '" +
      params.from +
      "' AND '" +
      params.to +
      "'";

    const rows = await search(auth, params.accountId, query);
    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };
    return rows.map((row) => mapGoogleAdsRow(row, account));
  },
};
