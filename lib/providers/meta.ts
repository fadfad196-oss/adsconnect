import type { Row } from "../metrics";
import { request, round2, toNumber } from "./http";
import {
  ProviderError,
  env,
  type AccountRef,
  type FetchParams,
  type Provider,
  type ProviderAuth,
} from "./types";

const SLUG = "meta-ads";
const API_VERSION = env("META_API_VERSION") ?? "v26.0";
const GRAPH = "https://graph.facebook.com/" + API_VERSION;
const SCOPES = ["ads_read"];

interface InsightAction {
  action_type?: string;
  value?: string;
}

interface Insight {
  date_start?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: InsightAction[];
  action_values?: InsightAction[];
  publisher_platform?: string;
}

interface Paged<T> {
  data?: T[];
  paging?: { next?: string };
}

/** Purchase-style actions, most specific first. */
const PURCHASE_ACTIONS = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
  "onsite_web_purchase",
  "app_custom_event.fb_mobile_purchase",
];

function pickAction(actions: InsightAction[] | undefined): number {
  if (!actions?.length) return 0;
  for (const type of PURCHASE_ACTIONS) {
    const match = actions.find((a) => a.action_type === type);
    if (match) return toNumber(match.value);
  }
  // No purchase event configured: fall back to lead-style conversions.
  const lead = actions.find((a) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead");
  return lead ? toNumber(lead.value) : 0;
}

/** Exported for tests: maps one insight row onto the shared schema. */
export function mapMetaInsight(insight: Insight, account: AccountRef, connector: string): Row {
  const platform = (insight.publisher_platform ?? "").toLowerCase();
  return {
    date: insight.date_start ?? "",
    source: connector === "instagram-ads" ? "Instagram Ads" : "Facebook Ads",
    connector,
    account_id: account.id,
    account_name: account.name,
    campaign: insight.campaign_name ?? "(not set)",
    campaign_id: insight.campaign_id ?? "",
    adgroup: insight.adset_name ?? "All ad sets",
    ad: insight.ad_name ?? "All ads",
    device: "",
    country: "",
    medium: "cpc",
    placement: platform,
    impressions: toNumber(insight.impressions),
    clicks: toNumber(insight.clicks),
    spend: round2(toNumber(insight.spend)),
    conversions: round2(pickAction(insight.actions)),
    revenue: round2(pickAction(insight.action_values)),
    sessions: toNumber(insight.clicks),
  } satisfies Row;
}

async function fetchAllPages<T>(url: string, limit = 20): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  let page = 0;
  while (next && page++ < limit) {
    const response: Paged<T> = await request<Paged<T>>(SLUG, next);
    out.push(...(response.data ?? []));
    next = response.paging?.next;
  }
  return out;
}

export const metaProvider: Provider = {
  slug: SLUG,
  label: "Meta Ads",
  kind: "oauth",
  connectors: ["facebook-ads", "instagram-ads"],
  requiredEnv: ["META_APP_ID", "META_APP_SECRET"],
  docsUrl: "https://developers.facebook.com/docs/marketing-api/insights/",
  accessNote:
    "A Meta app with ads_read. Standard access reads accounts your own login administers; reading other businesses' accounts needs App Review and business verification.",
  scopes: SCOPES,

  isConfigured() {
    return Boolean(env("META_APP_ID") && env("META_APP_SECRET"));
  },

  authorizeUrl(state, redirectUri) {
    const appId = env("META_APP_ID");
    if (!appId) throw new ProviderError(SLUG, "META_APP_ID is not set.", 500);
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: SCOPES.join(","),
    });
    return "https://www.facebook.com/" + API_VERSION + "/dialog/oauth?" + params.toString();
  },

  async exchangeCode(code, redirectUri) {
    const appId = env("META_APP_ID");
    const appSecret = env("META_APP_SECRET");
    if (!appId || !appSecret) throw new ProviderError(SLUG, "Meta app credentials are not set.", 500);

    const short = await request<{ access_token: string; expires_in?: number }>(
      SLUG,
      GRAPH +
        "/oauth/access_token?" +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
    );

    // Short-lived tokens die in an hour; exchange for the ~60 day one immediately.
    const long = await request<{ access_token: string; expires_in?: number }>(
      SLUG,
      GRAPH +
        "/oauth/access_token?" +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: short.access_token,
        }).toString(),
    ).catch(() => short);

    return {
      accessToken: long.access_token,
      expiresAt: long.expires_in ? Date.now() + long.expires_in * 1000 : undefined,
    };
  },

  async listAccounts(auth) {
    const accounts = await fetchAllPages<{ account_id?: string; name?: string; currency?: string }>(
      GRAPH +
        "/me/adaccounts?" +
        new URLSearchParams({
          fields: "account_id,name,currency",
          limit: "200",
          access_token: auth.accessToken,
        }).toString(),
    );
    if (!accounts.length) {
      throw new ProviderError(SLUG, "This Meta login has no ad accounts with ads_read access.", 404);
    }
    return accounts.map((account) => ({
      id: account.account_id ?? "",
      name: account.name ?? "Ad account " + account.account_id,
      currency: account.currency,
    }));
  },

  async fetchRows(auth, params: FetchParams) {
    const level = params.granularity === "campaign" ? "campaign" : params.granularity === "adgroup" ? "adset" : "ad";
    const fields = [
      "campaign_id",
      "campaign_name",
      ...(level !== "campaign" ? ["adset_name"] : []),
      ...(level === "ad" ? ["ad_name"] : []),
      "impressions",
      "clicks",
      "spend",
      "actions",
      "action_values",
    ];

    const accountId = params.accountId.startsWith("act_") ? params.accountId : "act_" + params.accountId;
    const url =
      GRAPH +
      "/" +
      accountId +
      "/insights?" +
      new URLSearchParams({
        level,
        time_increment: "1",
        fields: fields.join(","),
        time_range: JSON.stringify({ since: params.from, until: params.to }),
        limit: "500",
        access_token: auth.accessToken,
      }).toString();

    const insights = await fetchAllPages<Insight>(url, 40);
    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };
    const connector = auth.extra?.connector === "instagram-ads" ? "instagram-ads" : "facebook-ads";
    return insights.map((insight) => mapMetaInsight(insight, account, connector));
  },
};
