import {
  CONNECTORS_BY_SLUG,
  CORE_DIMENSIONS,
  CORE_METRICS,
  DERIVED_METRICS,
  type Connector,
} from "./catalog";

/* ------------------------------------------------------------------ random */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG so the same query always returns the same numbers. */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------- dates */

export const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_14d", label: "Last 14 days" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_90d", label: "Last 90 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_12_months", label: "Last 12 months" },
  { id: "ytd", label: "Year to date" },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number]["id"];

const DAY = 86400000;

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  return toISO(new Date(Date.parse(iso + "T00:00:00Z") + n * DAY));
}

export function today(): string {
  return toISO(new Date());
}

export function resolveRange(
  preset: string | undefined,
  from?: string,
  to?: string,
): { from: string; to: string } {
  if (from && to) return { from, to };
  const t = today();
  const yesterday = addDays(t, -1);
  switch (preset) {
    case "today":
      return { from: t, to: t };
    case "yesterday":
      return { from: yesterday, to: yesterday };
    case "last_7d":
      return { from: addDays(t, -7), to: yesterday };
    case "last_14d":
      return { from: addDays(t, -14), to: yesterday };
    case "last_90d":
      return { from: addDays(t, -90), to: yesterday };
    case "last_12_months":
      return { from: addDays(t, -365), to: yesterday };
    case "this_month":
      return { from: t.slice(0, 8) + "01", to: t };
    case "last_month": {
      const first = new Date(t.slice(0, 8) + "01T00:00:00Z");
      const lastEnd = new Date(first.getTime() - DAY);
      return { from: toISO(lastEnd).slice(0, 8) + "01", to: toISO(lastEnd) };
    }
    case "ytd":
      return { from: t.slice(0, 4) + "-01-01", to: t };
    case "last_30d":
    default:
      return { from: addDays(t, -30), to: yesterday };
  }
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Same length window immediately before the given one, for period-over-period. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const len = eachDate(from, to).length || 1;
  return { from: addDays(from, -len), to: addDays(to, -len) };
}

/* ------------------------------------------------------- dimension vocabulary */

const CAMPAIGN_THEMES = [
  "Brand Search",
  "Generic Search",
  "Competitor Search",
  "Prospecting | Broad",
  "Prospecting | Lookalike 1%",
  "Retargeting | 30d ATC",
  "Retargeting | Site visitors",
  "Performance Max | All products",
  "Shopping | Best sellers",
  "Video | Awareness",
  "Lead gen | Whitepaper",
  "Seasonal | Promo",
];

const ADGROUPS = ["Exact", "Phrase", "Broad", "Dynamic", "Top performers", "Test cell A", "Test cell B"];
const ADS = [
  "Free shipping - 1:1",
  "Free shipping - 4:5",
  "UGC testimonial",
  "Product carousel",
  "Static hero",
  "Discount 20%",
  "Founder story",
];
const DEVICES = ["desktop", "mobile", "tablet"];
const COUNTRIES = ["United States", "United Kingdom", "Germany", "Netherlands", "Canada", "Australia", "France"];

export interface Row {
  [key: string]: string | number;
}

interface Profile {
  spend: number;
  cpc: number;
  ctr: number;
  cvr: number;
  aov: number;
}

/** Per-connector economics, so Google search looks like search and TikTok like TikTok. */
function profile(connector: Connector): Profile {
  const r = rng("profile:" + connector.slug);
  const base: Record<string, Profile> = {
    "google-ads": { spend: 1850, cpc: 1.95, ctr: 5.8, cvr: 4.6, aov: 118 },
    "facebook-ads": { spend: 1420, cpc: 0.92, ctr: 1.45, cvr: 2.7, aov: 96 },
    "instagram-ads": { spend: 880, cpc: 0.88, ctr: 1.2, cvr: 2.3, aov: 92 },
    "tiktok-ads": { spend: 610, cpc: 0.55, ctr: 0.95, cvr: 1.6, aov: 74 },
    "linkedin-ads": { spend: 720, cpc: 6.4, ctr: 0.62, cvr: 5.1, aov: 420 },
    "microsoft-ads": { spend: 340, cpc: 1.35, ctr: 3.9, cvr: 3.8, aov: 121 },
    "amazon-ads": { spend: 960, cpc: 1.12, ctr: 0.42, cvr: 9.4, aov: 58 },
    "pinterest-ads": { spend: 240, cpc: 0.61, ctr: 0.78, cvr: 1.9, aov: 88 },
    "snapchat-ads": { spend: 190, cpc: 0.48, ctr: 0.71, cvr: 1.4, aov: 66 },
    "google-analytics-4": { spend: 0, cpc: 0, ctr: 2.4, cvr: 3.1, aov: 104 },
    "google-search-console": { spend: 0, cpc: 0, ctr: 3.6, cvr: 1.8, aov: 104 },
    klaviyo: { spend: 0, cpc: 0, ctr: 2.1, cvr: 6.4, aov: 102 },
    shopify: { spend: 0, cpc: 0, ctr: 0, cvr: 0, aov: 108 },
  };
  if (base[connector.slug]) return base[connector.slug];
  const paid = connector.category === "Paid advertising";
  return {
    spend: paid ? 120 + r() * 480 : 0,
    cpc: paid ? 0.4 + r() * 2.2 : 0,
    ctr: 0.5 + r() * 3,
    cvr: 1 + r() * 4,
    aov: 60 + r() * 90,
  };
}

function campaignsFor(connector: Connector, accountId: string): string[] {
  const r = rng("campaigns:" + connector.slug + accountId);
  const n = 4 + Math.floor(r() * 4);
  const pool = [...CAMPAIGN_THEMES];
  const picked: string[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    picked.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  const prefix = connector.name.split(" ")[0].toUpperCase().slice(0, 3);
  return picked.map((p) => prefix + " | " + p);
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

/** Weekly seasonality plus a slow trend, so charts have a believable shape. */
function seasonality(date: string, seed: string): number {
  const dow = new Date(date + "T00:00:00Z").getUTCDay();
  const weekend = dow === 0 || dow === 6 ? 0.78 : dow === 1 ? 1.07 : 1;
  const t = Date.parse(date + "T00:00:00Z") / DAY;
  const wave = 1 + 0.12 * Math.sin((t / 30) * Math.PI * 2 + (hash(seed) % 7));
  const trend = 1 + ((t % 400) / 400) * 0.18;
  return weekend * wave * trend;
}

export interface GenerateOptions {
  connectors: string[];
  accounts?: Record<string, { id: string; name: string }>;
  from: string;
  to: string;
  granularity?: "campaign" | "adgroup" | "ad";
}

/**
 * Builds the raw daily fact table. Every number comes from a seeded PRNG, so the
 * same window always renders the same figures on the server and in the browser.
 */
export function generateRows(opts: GenerateOptions): Row[] {
  const dates = eachDate(opts.from, opts.to);
  const rows: Row[] = [];
  const granularity = opts.granularity ?? "campaign";

  for (const slug of opts.connectors) {
    const connector = CONNECTORS_BY_SLUG[slug];
    if (!connector) continue;
    const acc =
      opts.accounts?.[slug] ??
      { id: "act_" + ((hash(slug) % 8999999) + 1000000), name: defaultAccountName(connector) };
    const p = profile(connector);
    const campaigns = campaignsFor(connector, acc.id);

    for (const date of dates) {
      const dayFactor = seasonality(date, slug);
      for (const campaign of campaigns) {
        const r = rng(slug + "|" + acc.id + "|" + campaign + "|" + date);
        const share = 0.6 + r() * 0.9;
        const variants = granularity === "campaign" ? 1 : granularity === "adgroup" ? 2 : 3;

        for (let v = 0; v < variants; v++) {
          const rv = rng(slug + "|" + campaign + "|" + date + "|" + v);
          const split = variants === 1 ? 1 : 1 / variants + (rv() - 0.5) * 0.25;
          const spend = round2((p.spend / campaigns.length) * share * dayFactor * split * (0.85 + rv() * 0.3));
          const cpc = Math.max(0.05, p.cpc * (0.8 + rv() * 0.45));
          const clicks =
            p.cpc > 0
              ? Math.round(spend / cpc)
              : Math.round(240 * share * dayFactor * split * (0.7 + rv() * 0.6));
          const ctr = Math.max(0.05, p.ctr * (0.75 + rv() * 0.5));
          const impressions = Math.round((clicks / ctr) * 100);
          const cvr = Math.max(0.1, p.cvr * (0.7 + rv() * 0.7));
          const conversions = Math.round((clicks * cvr) / 100);
          const revenue = round2(conversions * p.aov * (0.82 + rv() * 0.42));
          const sessions = Math.round(clicks * (0.86 + rv() * 0.12));

          const row: Row = {
            date,
            source: connector.name,
            connector: connector.slug,
            account_name: acc.name,
            account_id: acc.id,
            campaign,
            campaign_id: String((hash(campaign + acc.id) % 900000000) + 100000000),
            adgroup: variants === 1 ? "All ad groups" : pick(ADGROUPS, rv),
            ad: variants > 2 ? pick(ADS, rv) : "All ads",
            device: pick(DEVICES, rv),
            country: pick(COUNTRIES, rv),
            medium:
              connector.category === "Paid advertising"
                ? "cpc"
                : connector.category === "Email & SMS"
                  ? "email"
                  : "organic",
            impressions,
            clicks,
            spend,
            conversions,
            revenue,
            sessions,
          };

          for (const extra of connector.extraMetrics ?? []) {
            row[extra] = extraMetric(extra, row, rv);
          }
          for (const extra of connector.extraDimensions ?? []) {
            row[extra] = extraDimension(extra, row, rv);
          }
          rows.push(row);
        }
      }
    }
  }
  return rows;
}

const KEYWORDS = ["running shoes", "best crm software", "buy coffee beans", "acme pricing", "acme reviews", "cheap flights"];
const PLACEMENTS = ["feed", "stories", "reels", "search", "audience network"];

function extraDimension(key: string, row: Row, r: () => number): string {
  switch (key) {
    case "keyword":
    case "query":
      return pick(KEYWORDS, r);
    case "placement":
      return pick(PLACEMENTS, r);
    case "match_type":
      return pick(["exact", "phrase", "broad"], r);
    case "network":
      return pick(["search", "search partners", "display"], r);
    case "objective":
      return pick(["conversions", "traffic", "awareness"], r);
    case "page":
    case "landing_page":
      return pick(["/", "/pricing", "/products/kit", "/blog/attribution", "/checkout"], r);
    case "channel_group":
      return String(row.medium) === "cpc" ? "Paid Search" : "Organic";
    case "product":
    case "asin":
      return pick(["B08N5WRWNW", "B07FZ8S74R", "B09G3HRMVB", "B0BSHF7WHW"], r);
    case "sales_channel":
      return pick(["Online store", "POS", "Marketplace"], r);
    case "deal_stage":
    case "stage":
      return pick(["Discovery", "Proposal", "Negotiation", "Closed won"], r);
    case "owner":
      return pick(["A. Rivera", "J. Kim", "S. Okafor", "M. Dubois"], r);
    case "flow":
      return pick(["Welcome series", "Abandoned cart", "Browse abandonment", "Win-back"], r);
    case "campaign_type":
      return pick(["campaign", "flow"], r);
    case "video_id":
      return "vid_" + Math.floor(r() * 900000 + 100000);
    case "video_title":
      return pick(["Unboxing", "How it works", "Customer story", "60s explainer"], r);
    case "job_function":
      return pick(["Marketing", "Engineering", "Operations", "Finance"], r);
    case "industry":
      return pick(["SaaS", "Retail", "Healthcare", "Manufacturing"], r);
    case "insertion_order":
      return "IO-" + Math.floor(r() * 900 + 100);
    case "line_item":
      return "LI-" + Math.floor(r() * 9000 + 1000);
    case "product_id":
      return "SKU-" + Math.floor(r() * 9000 + 1000);
    default:
      return "n/a";
  }
}

function extraMetric(key: string, row: Row, r: () => number): number {
  const clicks = Number(row.clicks) || 0;
  const impressions = Number(row.impressions) || 0;
  const spend = Number(row.spend) || 0;
  const revenue = Number(row.revenue) || 0;
  const conversions = Number(row.conversions) || 0;
  switch (key) {
    case "reach":
      return Math.round(impressions * (0.55 + r() * 0.2));
    case "frequency":
      return round2(1.4 + r() * 1.6);
    case "video_views":
    case "views":
      return Math.round(impressions * (0.18 + r() * 0.22));
    case "video_watched_6s":
      return Math.round(impressions * (0.06 + r() * 0.08));
    case "engagements":
      return Math.round(clicks * (1.4 + r() * 1.2));
    case "followers":
      return Math.round(120 + r() * 400);
    case "subscribers_gained":
      return Math.round(4 + r() * 40);
    case "watch_time_minutes":
      return Math.round(impressions * (0.4 + r() * 0.8));
    case "saves":
      return Math.round(clicks * (0.2 + r() * 0.3));
    case "outbound_clicks":
      return Math.round(clicks * (0.6 + r() * 0.3));
    case "leads":
      return Math.max(0, Math.round(conversions * (0.8 + r() * 0.5)));
    case "orders":
    case "placed_orders":
      return conversions;
    case "units_ordered":
      return Math.round(conversions * (1.1 + r() * 0.9));
    case "refunds":
      return round2(revenue * (0.01 + r() * 0.04));
    case "aov":
      return conversions ? round2(revenue / conversions) : 0;
    case "new_customers":
      return Math.round(conversions * (0.4 + r() * 0.35));
    case "opens":
      return Math.round(clicks * (3.5 + r() * 2.5));
    case "unsubscribes":
      return Math.round(clicks * (0.01 + r() * 0.02));
    case "bounces":
      return Math.round(clicks * (0.02 + r() * 0.03));
    case "position":
      return round2(1 + r() * 18);
    case "visibility":
      return round2(r() * 100);
    case "backlinks":
      return Math.round(500 + r() * 9000);
    case "referring_domains":
      return Math.round(40 + r() * 600);
    case "calls":
    case "qualified_calls":
      return Math.round(conversions * (0.3 + r() * 0.6));
    case "messages":
      return Math.round(clicks * (0.4 + r() * 0.6));
    case "meetings":
      return Math.round(conversions * (0.25 + r() * 0.4));
    case "installs":
      return Math.round(clicks * (0.12 + r() * 0.2));
    case "acos":
      return revenue ? round2((spend / revenue) * 100) : 0;
    case "tacos":
      return revenue ? round2((spend / (revenue * 1.6)) * 100) : 0;
    case "payout":
    case "fees":
      return round2(revenue * (0.05 + r() * 0.1));
    case "actions":
      return Math.round(conversions * (0.8 + r() * 0.6));
    case "mrr":
      return round2(revenue * (0.3 + r() * 0.2));
    case "pipeline_value":
      return round2(revenue * (2 + r() * 3));
    case "won_revenue":
      return round2(revenue * (0.3 + r() * 0.3));
    case "deals":
    case "opportunities":
      return Math.round(conversions * (0.5 + r() * 0.5));
    case "churn_rate":
      return round2(0.5 + r() * 3);
    case "engaged_sessions":
      return Math.round((Number(row.sessions) || 0) * (0.55 + r() * 0.25));
    case "bounce_rate":
      return round2(28 + r() * 32);
    case "avg_session_duration":
      return round2(45 + r() * 160);
    case "buy_box_pct":
      return round2(60 + r() * 38);
    case "search_impression_share":
      return round2(35 + r() * 55);
    case "quality_score":
      return round2(4 + r() * 6);
    case "ttr":
      return round2(3 + r() * 8);
    case "direction_requests":
      return Math.round(conversions * (0.4 + r() * 0.8));
    case "favorites":
      return Math.round(clicks * (0.1 + r() * 0.2));
    case "profile_views":
      return Math.round(clicks * (0.5 + r() * 0.8));
    case "shares":
    case "replies":
      return Math.round(clicks * (0.05 + r() * 0.15));
    default:
      return round2(r() * 100);
  }
}

export function defaultAccountName(connector: Connector): string {
  return "Acme " + (connector.category === "E-commerce" ? "Store" : "Marketing");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ---------------------------------------------------------------- aggregation */

const DIMENSION_SET = new Set<string>([
  ...CORE_DIMENSIONS,
  "connector",
  "keyword",
  "query",
  "placement",
  "match_type",
  "network",
  "objective",
  "page",
  "landing_page",
  "channel_group",
  "product",
  "asin",
  "sales_channel",
  "deal_stage",
  "stage",
  "owner",
  "flow",
  "campaign_type",
  "video_id",
  "video_title",
  "job_function",
  "industry",
  "insertion_order",
  "line_item",
  "product_id",
]);

export function isDimension(field: string): boolean {
  return DIMENSION_SET.has(field);
}

export function isMetric(field: string): boolean {
  return !isDimension(field);
}

export function aggregate(rows: Row[], groupBy: string[], metrics: string[]): Row[] {
  const needed = new Set<string>(metrics.filter((m) => !DERIVED_METRICS[m]));
  for (const m of metrics) {
    const d = DERIVED_METRICS[m];
    if (d) {
      needed.add(d[0]);
      needed.add(d[1]);
    }
  }

  const SEP = String.fromCharCode(1);
  const buckets = new Map<string, Row>();
  for (const row of rows) {
    const key = groupBy.map((g) => String(row[g] ?? "")).join(SEP);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {};
      for (const g of groupBy) bucket[g] = row[g] ?? "";
      for (const m of needed) bucket[m] = 0;
      buckets.set(key, bucket);
    }
    for (const m of needed) {
      bucket[m] = round2(Number(bucket[m]) + (Number(row[m]) || 0));
    }
  }

  const out: Row[] = [];
  for (const bucket of buckets.values()) {
    const result: Row = {};
    for (const g of groupBy) result[g] = bucket[g];
    for (const m of metrics) result[m] = deriveMetric(m, bucket);
    out.push(result);
  }
  return out;
}

/** Ratio metrics are recomputed from summed components, never averaged. */
export function deriveMetric(metric: string, bucket: Row): number {
  const d = DERIVED_METRICS[metric];
  if (!d) return round2(Number(bucket[metric]) || 0);
  const [num, den, scale] = d;
  const denominator = Number(bucket[den]) || 0;
  if (!denominator) return 0;
  return round2(((Number(bucket[num]) || 0) / denominator) * scale);
}

export function totals(rows: Row[], metrics: string[]): Row {
  return aggregate(rows, [], metrics)[0] ?? Object.fromEntries(metrics.map((m) => [m, 0]));
}

export function sortRows(rows: Row[], field: string, dir: "asc" | "desc" = "desc"): Row[] {
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === "number" && typeof bv === "number") return dir === "desc" ? bv - av : av - bv;
    return dir === "desc"
      ? String(bv).localeCompare(String(av))
      : String(av).localeCompare(String(bv));
  });
}

export function fieldsFor(connectorSlugs: string[]): { dimensions: string[]; metrics: string[] } {
  const dims = new Set<string>(CORE_DIMENSIONS);
  const mets = new Set<string>(CORE_METRICS);
  for (const slug of connectorSlugs) {
    const connector = CONNECTORS_BY_SLUG[slug];
    if (!connector) continue;
    connector.extraDimensions?.forEach((d) => dims.add(d));
    connector.extraMetrics?.forEach((m) => mets.add(m));
  }
  return { dimensions: [...dims], metrics: [...mets] };
}
