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

const SLUG = "linkedin-ads";
const REST = "https://api.linkedin.com/rest";
/** LinkedIn versions its REST API by YYYYMM and does not default to the latest. */
const VERSION = env("LINKEDIN_API_VERSION") ?? "202608";
const SCOPES = ["r_ads", "r_ads_reporting"];

interface AnalyticsElement {
  impressions?: number;
  clicks?: number;
  costInUsd?: string;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
  conversionValueInLocalCurrency?: { amount?: string };
  dateRange?: { start?: { year: number; month: number; day: number } };
  pivotValues?: string[];
}

function headers(auth: ProviderAuth): Record<string, string> {
  return {
    authorization: "Bearer " + auth.accessToken,
    "LinkedIn-Version": VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

function isoDate(part: { year: number; month: number; day: number } | undefined): string {
  if (!part) return "";
  return (
    String(part.year) + "-" + String(part.month).padStart(2, "0") + "-" + String(part.day).padStart(2, "0")
  );
}

function urnId(urn: string | undefined): string {
  if (!urn) return "";
  const parts = urn.split(":");
  return parts[parts.length - 1] ?? "";
}

/** Exported for tests: maps one analytics element onto the shared schema. */
export function mapLinkedInElement(
  element: AnalyticsElement,
  account: AccountRef,
  campaignNames: Record<string, string> = {},
): Row {
  const campaignId = urnId(element.pivotValues?.[0]);
  return {
    date: isoDate(element.dateRange?.start),
    source: "LinkedIn Ads",
    connector: SLUG,
    account_id: account.id,
    account_name: account.name,
    campaign: campaignNames[campaignId] ?? (campaignId ? "Campaign " + campaignId : "(not set)"),
    campaign_id: campaignId,
    adgroup: "All ad groups",
    ad: "All ads",
    device: "",
    country: "",
    medium: "cpc",
    impressions: toNumber(element.impressions),
    clicks: toNumber(element.clicks),
    spend: round2(toNumber(element.costInLocalCurrency ?? element.costInUsd)),
    conversions: toNumber(element.externalWebsiteConversions),
    revenue: round2(toNumber(element.conversionValueInLocalCurrency?.amount)),
    sessions: toNumber(element.clicks),
    leads: toNumber(element.externalWebsiteConversions),
  } satisfies Row;
}

function dateRangeParam(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (
    "(start:(year:" + fy + ",month:" + fm + ",day:" + fd + ")," +
    "end:(year:" + ty + ",month:" + tm + ",day:" + td + "))"
  );
}

export const linkedinProvider: Provider = {
  slug: SLUG,
  label: "LinkedIn Ads",
  kind: "oauth",
  connectors: [SLUG],
  requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting",
  accessNote:
    "Needs Marketing Developer Platform access on the LinkedIn app. This is the slowest approval of the six; apply before you need it.",
  scopes: SCOPES,

  isConfigured() {
    return Boolean(env("LINKEDIN_CLIENT_ID") && env("LINKEDIN_CLIENT_SECRET"));
  },

  authorizeUrl(state, redirectUri) {
    const clientId = env("LINKEDIN_CLIENT_ID");
    if (!clientId) throw new ProviderError(SLUG, "LINKEDIN_CLIENT_ID is not set.", 500);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
    });
    return "https://www.linkedin.com/oauth/v2/authorization?" + params.toString();
  },

  async exchangeCode(code, redirectUri) {
    const clientId = env("LINKEDIN_CLIENT_ID");
    const clientSecret = env("LINKEDIN_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new ProviderError(SLUG, "LinkedIn credentials are not set.", 500);

    const token = await request<{ access_token: string; expires_in?: number; refresh_token?: string }>(
      SLUG,
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        form: {
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        },
      },
    );
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    };
  },

  async refresh(auth) {
    if (!auth.refreshToken) {
      throw new ProviderError(SLUG, "LinkedIn access token expired. Reconnect the account.", 401, true);
    }
    const clientId = env("LINKEDIN_CLIENT_ID");
    const clientSecret = env("LINKEDIN_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new ProviderError(SLUG, "LinkedIn credentials are not set.", 500);

    const token = await request<{ access_token: string; expires_in?: number; refresh_token?: string }>(
      SLUG,
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        form: {
          grant_type: "refresh_token",
          refresh_token: auth.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        },
      },
    );
    return {
      ...auth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? auth.refreshToken,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    };
  },

  async listAccounts(auth) {
    const response = await request<{ elements?: { id?: number; name?: string; currency?: string }[] }>(
      SLUG,
      REST + "/adAccounts?q=search&sortOrder=DESCENDING",
      { headers: headers(auth) },
    );
    const accounts = (response.elements ?? []).map((element) => ({
      id: String(element.id ?? ""),
      name: element.name ?? "Ad account " + element.id,
      currency: element.currency,
    }));
    if (!accounts.length) {
      throw new ProviderError(SLUG, "No LinkedIn ad accounts are visible to this login.", 404);
    }
    return accounts;
  },

  async fetchRows(auth, params: FetchParams) {
    const fields = [
      "impressions",
      "clicks",
      "costInLocalCurrency",
      "costInUsd",
      "externalWebsiteConversions",
      "conversionValueInLocalCurrency",
      "dateRange",
      "pivotValues",
    ].join(",");

    const accountUrn = "urn:li:sponsoredAccount:" + params.accountId;
    const url =
      REST +
      "/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=DAILY" +
      "&dateRange=" + dateRangeParam(params.from, params.to) +
      "&accounts=List(" + encodeURIComponent(accountUrn) + ")" +
      "&fields=" + fields;

    const response = await request<{ elements?: AnalyticsElement[] }>(SLUG, url, { headers: headers(auth) });
    const elements = response.elements ?? [];

    // Analytics only returns campaign URNs, so names come from a second call.
    const campaignIds = [...new Set(elements.map((e) => urnId(e.pivotValues?.[0])).filter(Boolean))];
    const campaignNames = await fetchCampaignNames(auth, campaignIds);

    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };
    return elements.map((element) => mapLinkedInElement(element, account, campaignNames));
  },
};

async function fetchCampaignNames(auth: ProviderAuth, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const names: Record<string, string> = {};

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const response = await request<{ results?: Record<string, { id?: number; name?: string }> }>(
        SLUG,
        REST + "/adCampaigns?ids=List(" + batch.join(",") + ")",
        { headers: headers(auth) },
      );
      for (const [id, campaign] of Object.entries(response.results ?? {})) {
        if (campaign?.name) names[id] = campaign.name;
      }
    } catch {
      // Names are a nicety; the ids still identify the row.
    }
  }
  return names;
}
