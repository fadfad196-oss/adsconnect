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

const SLUG = "tiktok-ads";
const BASE = "https://business-api.tiktok.com/open_api/v1.3";

interface TikTokEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

interface ReportItem {
  dimensions?: Record<string, string>;
  metrics?: Record<string, string | number>;
}

interface ReportData {
  list?: ReportItem[];
  page_info?: { total_page?: number; page?: number };
}

/**
 * TikTok answers 200 with a non-zero `code` on failure, so the envelope has to
 * be checked explicitly rather than trusting the HTTP status.
 */
function unwrap<T>(envelope: TikTokEnvelope<T>): T {
  if (envelope.code && envelope.code !== 0) {
    const reauthorize = envelope.code === 40001 || envelope.code === 40105;
    throw new ProviderError(SLUG, envelope.message ?? "TikTok returned code " + envelope.code, 502, reauthorize);
  }
  if (!envelope.data) throw new ProviderError(SLUG, "TikTok returned an empty response.");
  return envelope.data;
}

const BASE_METRICS = ["campaign_name", "spend", "impressions", "clicks", "conversion"];

/**
 * Revenue metric names differ by what the advertiser tracks, and asking for one
 * the account does not have fails the whole report, so it is opt-in.
 */
function revenueMetric(): string | undefined {
  return env("TIKTOK_REVENUE_METRIC");
}

/** Exported for tests: maps one report item onto the shared schema. */
export function mapTikTokRow(item: ReportItem, account: AccountRef, revenueKey?: string): Row {
  const dimensions = item.dimensions ?? {};
  const metrics = item.metrics ?? {};
  return {
    date: dimensions.stat_time_day ? String(dimensions.stat_time_day).slice(0, 10) : "",
    source: "TikTok Ads",
    connector: SLUG,
    account_id: account.id,
    account_name: account.name,
    campaign: String(metrics.campaign_name ?? dimensions.campaign_id ?? "(not set)"),
    campaign_id: String(dimensions.campaign_id ?? ""),
    adgroup: String(metrics.adgroup_name ?? "All ad groups"),
    ad: String(metrics.ad_name ?? "All ads"),
    device: "",
    country: "",
    medium: "cpc",
    impressions: toNumber(metrics.impressions),
    clicks: toNumber(metrics.clicks),
    spend: round2(toNumber(metrics.spend)),
    conversions: round2(toNumber(metrics.conversion)),
    revenue: revenueKey ? round2(toNumber(metrics[revenueKey])) : 0,
    sessions: toNumber(metrics.clicks),
  } satisfies Row;
}

export const tiktokProvider: Provider = {
  slug: SLUG,
  label: "TikTok Ads",
  kind: "oauth",
  connectors: [SLUG],
  requiredEnv: ["TIKTOK_APP_ID", "TIKTOK_APP_SECRET"],
  docsUrl: "https://business-api.tiktok.com/portal/docs?id=1740302848100353",
  accessNote:
    "A TikTok for Business developer app with the Ads Management scope. The app must be approved before it can read live advertiser data.",

  isConfigured() {
    return Boolean(env("TIKTOK_APP_ID") && env("TIKTOK_APP_SECRET"));
  },

  authorizeUrl(state, redirectUri) {
    const appId = env("TIKTOK_APP_ID");
    if (!appId) throw new ProviderError(SLUG, "TIKTOK_APP_ID is not set.", 500);
    const params = new URLSearchParams({ app_id: appId, state, redirect_uri: redirectUri });
    return "https://business-api.tiktok.com/portal/auth?" + params.toString();
  },

  async exchangeCode(code) {
    const appId = env("TIKTOK_APP_ID");
    const secret = env("TIKTOK_APP_SECRET");
    if (!appId || !secret) throw new ProviderError(SLUG, "TikTok app credentials are not set.", 500);

    const data = unwrap(
      await request<TikTokEnvelope<{ access_token?: string; advertiser_ids?: string[] }>>(
        SLUG,
        BASE + "/oauth2/access_token/",
        { method: "POST", body: { app_id: appId, secret, auth_code: code, grant_type: "auth_code" } },
      ),
    );

    if (!data.access_token) throw new ProviderError(SLUG, "TikTok did not return an access token.");
    return {
      accessToken: data.access_token,
      extra: data.advertiser_ids?.length ? { advertiserIds: data.advertiser_ids.join(",") } : undefined,
    };
  },

  async listAccounts(auth) {
    const appId = env("TIKTOK_APP_ID");
    const secret = env("TIKTOK_APP_SECRET");
    if (!appId || !secret) throw new ProviderError(SLUG, "TikTok app credentials are not set.", 500);

    const data = unwrap(
      await request<TikTokEnvelope<{ list?: { advertiser_id?: string; advertiser_name?: string }[] }>>(
        SLUG,
        BASE + "/oauth2/advertiser/get/?" + new URLSearchParams({ app_id: appId, secret }).toString(),
        { headers: { "Access-Token": auth.accessToken } },
      ),
    );

    const accounts = (data.list ?? []).map((item) => ({
      id: item.advertiser_id ?? "",
      name: item.advertiser_name ?? "Advertiser " + item.advertiser_id,
    }));
    if (!accounts.length) {
      throw new ProviderError(SLUG, "No TikTok advertiser accounts were granted to this app.", 404);
    }
    return accounts;
  },

  async fetchRows(auth, params: FetchParams) {
    const dataLevel =
      params.granularity === "campaign"
        ? "AUCTION_CAMPAIGN"
        : params.granularity === "adgroup"
          ? "AUCTION_ADGROUP"
          : "AUCTION_AD";
    const dimensionId =
      dataLevel === "AUCTION_CAMPAIGN" ? "campaign_id" : dataLevel === "AUCTION_ADGROUP" ? "adgroup_id" : "ad_id";

    const revenueKey = revenueMetric();
    const metrics = [...BASE_METRICS, ...(revenueKey ? [revenueKey] : [])];
    if (dataLevel !== "AUCTION_CAMPAIGN") metrics.push("adgroup_name");
    if (dataLevel === "AUCTION_AD") metrics.push("ad_name");

    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };
    const rows: Row[] = [];

    for (let page = 1; page <= 40; page++) {
      const query = new URLSearchParams({
        advertiser_id: params.accountId,
        report_type: "BASIC",
        service_type: "AUCTION",
        data_level: dataLevel,
        dimensions: JSON.stringify([dimensionId, "stat_time_day"]),
        metrics: JSON.stringify(metrics),
        start_date: params.from,
        end_date: params.to,
        page: String(page),
        page_size: "1000",
      });

      const data = unwrap(
        await request<TikTokEnvelope<ReportData>>(SLUG, BASE + "/report/integrated/get/?" + query.toString(), {
          headers: { "Access-Token": auth.accessToken },
        }),
      );

      rows.push(...(data.list ?? []).map((item) => mapTikTokRow(item, account, revenueKey)));
      if (page >= (data.page_info?.total_page ?? 1)) break;
    }

    return rows;
  },
};
