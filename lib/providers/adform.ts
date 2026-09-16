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

const SLUG = "adform";
const API = "https://api.adform.com";
const TOKEN_URL = "https://id.adform.com/sts/connect/token";

const DEFAULT_SCOPE = [
  "https://api.adform.com/scope/eapi",
  "https://api.adform.com/scope/buyer.stats",
].join(" ");

interface ReportResponse {
  reportData?: {
    columnHeaders?: string[];
    rows?: (string | number)[][];
  };
}

interface OperationStatus {
  status?: string;
  location?: string;
  error?: { message?: string };
}

/**
 * Adform names its stats columns per request. Mapping by header position keeps
 * this working when a client's metric specifiers differ.
 */
export function mapAdformReport(response: ReportResponse, account: AccountRef): Row[] {
  const headers = (response.reportData?.columnHeaders ?? []).map((h) => String(h).toLowerCase());
  const index = (name: string) => headers.indexOf(name.toLowerCase());

  const dateAt = index("date");
  const campaignAt = index("campaign");
  const lineItemAt = index("lineitem");
  const impressionsAt = index("impressions");
  const clicksAt = index("clicks");
  const costAt = index("cost");
  const conversionsAt = index("conversions");
  const salesAt = index("sales");

  return (response.reportData?.rows ?? []).map((row) => {
    const date = dateAt >= 0 ? String(row[dateAt]) : "";
    return {
      date: date.length >= 10 ? date.slice(0, 10) : date,
      source: "Adform",
      connector: SLUG,
      account_id: account.id,
      account_name: account.name,
      campaign: campaignAt >= 0 ? String(row[campaignAt]) : "(not set)",
      campaign_id: "",
      adgroup: lineItemAt >= 0 ? String(row[lineItemAt]) : "All line items",
      ad: "All ads",
      device: "",
      country: "",
      medium: "display",
      impressions: toNumber(impressionsAt >= 0 ? row[impressionsAt] : 0),
      clicks: toNumber(clicksAt >= 0 ? row[clicksAt] : 0),
      spend: round2(toNumber(costAt >= 0 ? row[costAt] : 0)),
      conversions: round2(toNumber(conversionsAt >= 0 ? row[conversionsAt] : 0)),
      revenue: round2(toNumber(salesAt >= 0 ? row[salesAt] : 0)),
      sessions: toNumber(clicksAt >= 0 ? row[clicksAt] : 0),
    } satisfies Row;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const adformProvider: Provider = {
  slug: SLUG,
  label: "Adform",
  kind: "client_credentials",
  connectors: [SLUG],
  requiredEnv: ["ADFORM_CLIENT_ID", "ADFORM_CLIENT_SECRET"],
  docsUrl: "https://api.adform.com/help/references/buyer-solutions/reporting/stats",
  accessNote:
    "Adform issues API credentials on request. Ask your account manager or technical@adform.com for a client id, secret and the reporting scopes.",

  isConfigured() {
    return Boolean(env("ADFORM_CLIENT_ID") && env("ADFORM_CLIENT_SECRET"));
  },

  /** No user redirect: Adform authenticates the integration itself. */
  async authenticate() {
    const clientId = env("ADFORM_CLIENT_ID");
    const clientSecret = env("ADFORM_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new ProviderError(SLUG, "Adform credentials are not set.", 500);

    const token = await request<{ access_token: string; expires_in?: number }>(SLUG, TOKEN_URL, {
      form: {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: env("ADFORM_SCOPE") ?? DEFAULT_SCOPE,
      },
    });
    return {
      accessToken: token.access_token,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    };
  },

  async refresh() {
    return adformProvider.authenticate!();
  },

  async listAccounts(auth) {
    // Adform scopes data by the credential itself, so clients are the account list.
    try {
      const response = await request<{ data?: { id?: number; name?: string }[] } | { id?: number; name?: string }[]>(
        SLUG,
        API + "/v1/buyer/clients",
        { headers: { authorization: "Bearer " + auth.accessToken } },
      );
      const list = Array.isArray(response) ? response : (response.data ?? []);
      const accounts = list
        .filter((client) => client && client.id !== undefined)
        .map((client) => ({ id: String(client.id), name: client.name ?? "Client " + client.id }));
      if (accounts.length) return accounts;
    } catch {
      // Older credentials cannot list clients; fall through to the single account.
    }
    return [{ id: env("ADFORM_CLIENT_ID") ?? "adform", name: "Adform (client credentials)" }];
  },

  async fetchRows(auth, params: FetchParams) {
    const dimensions = ["date", "campaign"];
    if (params.granularity !== "campaign") dimensions.push("lineItem");

    const body = {
      filter: { date: { from: params.from, to: params.to } },
      dimensions,
      metrics: [
        { metric: "impressions" },
        { metric: "clicks" },
        { metric: "cost", specs: { cost: env("ADFORM_COST_SPEC") ?? "gross" } },
        { metric: "conversions" },
        { metric: "sales" },
      ],
      paging: { offset: 0, limit: 100000 },
    };

    // Stats are asynchronous: submit, poll the operation, then read the report.
    const submitted = (await request<Response>(SLUG, API + "/v1/buyer/stats/data", {
      method: "POST",
      headers: { authorization: "Bearer " + auth.accessToken },
      body,
      raw: true,
    })) as unknown as Response;

    const operationUrl = submitted.headers.get("operation-location") ?? submitted.headers.get("location");
    if (!operationUrl) {
      throw new ProviderError(SLUG, "Adform accepted the report but returned no operation location.");
    }

    let reportUrl: string | undefined;
    for (let attempt = 0; attempt < 30; attempt++) {
      await sleep(attempt === 0 ? 1000 : 2000);
      const status = await request<OperationStatus>(SLUG, absolute(operationUrl), {
        headers: { authorization: "Bearer " + auth.accessToken },
      });
      const state = (status.status ?? "").toLowerCase();
      if (state === "succeeded" || state === "completed") {
        reportUrl = status.location;
        break;
      }
      if (state === "failed" || status.error) {
        throw new ProviderError(SLUG, status.error?.message ?? "Adform report generation failed.");
      }
    }

    if (!reportUrl) throw new ProviderError(SLUG, "Adform report did not finish in time.", 504);

    const report = await request<ReportResponse>(SLUG, absolute(reportUrl), {
      headers: { authorization: "Bearer " + auth.accessToken },
    });
    const account: AccountRef = { id: params.accountId, name: auth.extra?.accountName ?? params.accountId };
    return mapAdformReport(report, account);
  },
};

function absolute(url: string): string {
  return url.startsWith("http") ? url : API + (url.startsWith("/") ? url : "/" + url);
}
