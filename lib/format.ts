const CURRENCY_METRICS = new Set([
  "spend",
  "revenue",
  "cpc",
  "cpm",
  "cpa",
  "aov",
  "mrr",
  "pipeline_value",
  "won_revenue",
  "payout",
  "fees",
  "refunds",
]);

const PERCENT_METRICS = new Set([
  "ctr",
  "conversion_rate",
  "bounce_rate",
  "acos",
  "tacos",
  "churn_rate",
  "search_impression_share",
  "buy_box_pct",
  "visibility",
  "ttr",
]);

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Ratios with a zero denominator come back as 0; showing "-" is more honest. */
const UNDEFINED_AT_ZERO = new Set(["roas", "cpa", "cpc", "cpm", "acos", "tacos", "conversion_rate", "ctr"]);

/** One entry point so a metric looks the same in every table, tile and tooltip. */
export function formatMetric(metric: string, value: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (value === 0 && UNDEFINED_AT_ZERO.has(metric)) return "-";
  if (CURRENCY_METRICS.has(metric)) return formatCurrency(value);
  if (PERCENT_METRICS.has(metric)) return value.toFixed(2) + "%";
  if (metric === "roas") return value.toFixed(2) + "x";
  if (metric === "position" || metric === "frequency" || metric === "quality_score") return value.toFixed(1);
  return formatNumber(value);
}

export function metricLabel(metric: string): string {
  const overrides: Record<string, string> = {
    ctr: "CTR",
    cpc: "CPC",
    cpm: "CPM",
    cpa: "CPA",
    roas: "ROAS",
    aov: "AOV",
    mrr: "MRR",
    acos: "ACOS",
    tacos: "TACOS",
    ttr: "TTR",
    account_id: "Account ID",
    campaign_id: "Campaign ID",
    video_id: "Video ID",
    product_id: "Product ID",
    asin: "ASIN",
  };
  if (overrides[metric]) return overrides[metric];
  return metric.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());
}

export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return diffMinutes + "m ago";
  if (diffMinutes < 1440) return Math.round(diffMinutes / 60) + "h ago";
  return Math.round(diffMinutes / 1440) + "d ago";
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Metrics where a fall is the good outcome. */
export const LOWER_IS_BETTER = new Set(["cpc", "cpa", "cpm", "acos", "tacos", "bounce_rate", "churn_rate", "position", "unsubscribes", "refunds"]);
