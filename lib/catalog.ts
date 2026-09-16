export type ConnectorCategory =
  | "Paid advertising"
  | "Social media"
  | "Web analytics"
  | "E-commerce"
  | "CRM & sales"
  | "Email & SMS"
  | "SEO"
  | "Call tracking"
  | "Affiliate & attribution"
  | "Finance & billing"
  | "Productivity";

export type AuthType = "oauth" | "api_key" | "file";

export interface Connector {
  slug: string;
  name: string;
  category: ConnectorCategory;
  auth: AuthType;
  color: string;
  popular?: boolean;
  tagline: string;
  /** Extra metric fields this connector exposes on top of the core set. */
  extraMetrics?: string[];
  /** Extra dimension fields this connector exposes on top of the core set. */
  extraDimensions?: string[];
}

/** Fields every advertising-style connector returns, mirroring the public API schema. */
export const CORE_DIMENSIONS = [
  "date",
  "source",
  "account_name",
  "account_id",
  "campaign",
  "campaign_id",
  "adgroup",
  "ad",
  "device",
  "country",
  "medium",
] as const;

export const CORE_METRICS = [
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "revenue",
  "sessions",
  "ctr",
  "cpc",
  "cpm",
  "cpa",
  "roas",
  "conversion_rate",
] as const;

export type CoreDimension = (typeof CORE_DIMENSIONS)[number];
export type CoreMetric = (typeof CORE_METRICS)[number];

/** Metrics that are ratios and must be recomputed after aggregation, never summed. */
export const DERIVED_METRICS: Record<string, [numerator: string, denominator: string, scale: number]> = {
  ctr: ["clicks", "impressions", 100],
  cpc: ["spend", "clicks", 1],
  cpm: ["spend", "impressions", 1000],
  cpa: ["spend", "conversions", 1],
  roas: ["revenue", "spend", 1],
  conversion_rate: ["conversions", "clicks", 100],
};

const c = (
  slug: string,
  name: string,
  category: ConnectorCategory,
  color: string,
  tagline: string,
  opts: Partial<Connector> = {},
): Connector => ({ slug, name, category, color, tagline, auth: "oauth", ...opts });

export const CONNECTORS: Connector[] = [
  // ---------------------------------------------------------------- paid ads
  c("facebook-ads", "Facebook Ads", "Paid advertising", "#1877f2", "Campaign, ad set and ad level insights from Meta.", { popular: true, extraMetrics: ["reach", "frequency", "video_views"], extraDimensions: ["placement", "objective"] }),
  c("instagram-ads", "Instagram Ads", "Paid advertising", "#c13584", "Meta placements broken out for Instagram feeds, reels and stories.", { popular: true, extraDimensions: ["placement"] }),
  c("google-ads", "Google Ads", "Paid advertising", "#4285f4", "Search, Shopping, Performance Max and Demand Gen performance.", { popular: true, extraMetrics: ["search_impression_share", "quality_score"], extraDimensions: ["keyword", "match_type", "network"] }),
  c("microsoft-ads", "Microsoft Advertising", "Paid advertising", "#008373", "Bing search and audience network campaign metrics.", { extraDimensions: ["keyword", "network"] }),
  c("tiktok-ads", "TikTok Ads", "Paid advertising", "#010101", "TikTok for Business campaign, ad group and creative reporting.", { popular: true, extraMetrics: ["video_views", "video_watched_6s"] }),
  c("linkedin-ads", "LinkedIn Ads", "Paid advertising", "#0a66c2", "Sponsored content and lead gen form performance.", { popular: true, extraMetrics: ["leads"], extraDimensions: ["job_function", "industry"] }),
  c("snapchat-ads", "Snapchat Ads", "Paid advertising", "#fffc00", "Snap campaign delivery, swipe-ups and conversions."),
  c("pinterest-ads", "Pinterest Ads", "Paid advertising", "#e60023", "Pin and campaign level spend, saves and outbound clicks.", { extraMetrics: ["saves", "outbound_clicks"] }),
  c("reddit-ads", "Reddit Ads", "Paid advertising", "#ff4500", "Reddit campaign and ad group reporting."),
  c("x-ads", "X Ads", "Paid advertising", "#0f1419", "X (Twitter) campaign, line item and promoted post metrics."),
  c("amazon-ads", "Amazon Ads", "Paid advertising", "#ff9900", "Sponsored Products, Brands and Display with ACOS and TACOS.", { popular: true, extraMetrics: ["acos", "tacos", "units_ordered"], extraDimensions: ["asin", "keyword"] }),
  c("apple-search-ads", "Apple Search Ads", "Paid advertising", "#555555", "App Store search campaign installs and tap-through rate.", { extraMetrics: ["installs", "ttr"] }),
  c("criteo", "Criteo", "Paid advertising", "#f60", "Retargeting and retail media campaign reporting."),
  c("taboola", "Taboola", "Paid advertising", "#0480be", "Native discovery campaign spend and conversions."),
  c("outbrain", "Outbrain", "Paid advertising", "#ee6c2e", "Native content amplification metrics."),
  c("dv360", "Display & Video 360", "Paid advertising", "#34a853", "Programmatic line item and insertion order delivery.", { extraDimensions: ["insertion_order", "line_item"] }),
  c("the-trade-desk", "The Trade Desk", "Paid advertising", "#0099cc", "Programmatic buying performance across channels.", { auth: "api_key" }),
  c("quora-ads", "Quora Ads", "Paid advertising", "#b92b27", "Quora campaign spend and conversions."),
  c("spotify-ads", "Spotify Ads", "Paid advertising", "#1db954", "Audio and video ad delivery metrics."),
  c("teads", "Teads", "Paid advertising", "#ff3d3d", "Outstream video campaign delivery."),
  c("yandex-direct", "Yandex Direct", "Paid advertising", "#ffcc00", "Yandex search and network campaign metrics.", { auth: "api_key" }),
  c("bing-shopping", "Bing Shopping", "Paid advertising", "#0078d4", "Microsoft Shopping campaign product performance.", { extraDimensions: ["product_id"] }),
  c("stackadapt", "StackAdapt", "Paid advertising", "#3ea8c8", "Programmatic native, display and CTV reporting.", { auth: "api_key" }),
  c("adroll", "AdRoll", "Paid advertising", "#00aeef", "Retargeting campaign performance."),
  c("bluesky-ads", "Bluesky Ads", "Paid advertising", "#0085ff", "Campaign delivery from the Bluesky ad platform.", { auth: "api_key" }),
  c("waze-ads", "Waze Ads", "Paid advertising", "#33ccff", "Location-based pin and takeover campaign metrics."),
  c("dsp-yahoo", "Yahoo DSP", "Paid advertising", "#6001d2", "Yahoo demand side platform delivery."),
  c("vk-ads", "VK Ads", "Paid advertising", "#0077ff", "VK campaign spend and conversions.", { auth: "api_key" }),

  // ------------------------------------------------------------ social media
  c("facebook-pages", "Facebook Pages", "Social media", "#1877f2", "Organic page reach, engagement and follower growth.", { extraMetrics: ["reach", "engagements", "followers"] }),
  c("instagram-insights", "Instagram Insights", "Social media", "#e1306c", "Organic profile, post and story performance.", { popular: true, extraMetrics: ["reach", "saves", "profile_views", "followers"] }),
  c("tiktok-organic", "TikTok Organic", "Social media", "#25f4ee", "Organic video views, shares and follower growth.", { extraMetrics: ["video_views", "shares", "followers"] }),
  c("youtube-analytics", "YouTube Analytics", "Social media", "#ff0000", "Views, watch time and subscriber changes by video.", { popular: true, extraMetrics: ["views", "watch_time_minutes", "subscribers_gained"], extraDimensions: ["video_id", "video_title"] }),
  c("linkedin-pages", "LinkedIn Pages", "Social media", "#0a66c2", "Company page impressions, engagement and followers.", { extraMetrics: ["engagements", "followers"] }),
  c("pinterest-organic", "Pinterest Organic", "Social media", "#e60023", "Organic pin impressions, saves and outbound clicks.", { extraMetrics: ["saves", "outbound_clicks"] }),
  c("x-organic", "X Organic", "Social media", "#0f1419", "Organic post impressions and engagement."),
  c("threads", "Threads", "Social media", "#000000", "Threads post reach and interactions.", { extraMetrics: ["reach", "replies"] }),
  c("hootsuite", "Hootsuite", "Social media", "#000000", "Cross-network scheduled post performance.", { auth: "api_key" }),
  c("sprout-social", "Sprout Social", "Social media", "#75dd66", "Unified social engagement reporting.", { auth: "api_key" }),
  c("buffer", "Buffer", "Social media", "#231f20", "Scheduled post analytics across profiles.", { auth: "api_key" }),
  c("twitch", "Twitch", "Social media", "#9146ff", "Channel views, followers and stream metrics."),

  // ----------------------------------------------------------- web analytics
  c("google-analytics-4", "Google Analytics 4", "Web analytics", "#e8710a", "Sessions, events, conversions and revenue by channel.", { popular: true, extraMetrics: ["engaged_sessions", "bounce_rate", "avg_session_duration"], extraDimensions: ["landing_page", "channel_group"] }),
  c("adobe-analytics", "Adobe Analytics", "Web analytics", "#fa0f00", "Report suite metrics and eVars.", { auth: "api_key" }),
  c("matomo", "Matomo", "Web analytics", "#3152a0", "Self-hosted analytics visits and goals.", { auth: "api_key" }),
  c("plausible", "Plausible", "Web analytics", "#5850ec", "Privacy-first pageviews and goal conversions.", { auth: "api_key" }),
  c("mixpanel", "Mixpanel", "Web analytics", "#7856ff", "Product events, funnels and retention.", { auth: "api_key" }),
  c("amplitude", "Amplitude", "Web analytics", "#1f8ded", "Behavioural event and cohort data.", { auth: "api_key" }),
  c("hotjar", "Hotjar", "Web analytics", "#fd3a5c", "Session recordings and feedback volumes.", { auth: "api_key" }),
  c("piwik-pro", "Piwik PRO", "Web analytics", "#29319b", "Enterprise analytics sessions and goals.", { auth: "api_key" }),
  c("google-search-console", "Google Search Console", "SEO", "#458cf5", "Query level clicks, impressions, CTR and position.", { popular: true, extraMetrics: ["position"], extraDimensions: ["query", "page"] }),

  // --------------------------------------------------------------- ecommerce
  c("shopify", "Shopify", "E-commerce", "#95bf47", "Orders, refunds, products and customer cohorts.", { popular: true, extraMetrics: ["orders", "refunds", "aov", "new_customers"], extraDimensions: ["product", "sales_channel"] }),
  c("woocommerce", "WooCommerce", "E-commerce", "#96588a", "WordPress store orders and product revenue.", { auth: "api_key", extraMetrics: ["orders", "aov"] }),
  c("bigcommerce", "BigCommerce", "E-commerce", "#121118", "Store orders, products and channels.", { extraMetrics: ["orders", "aov"] }),
  c("magento", "Adobe Commerce", "E-commerce", "#ee672f", "Magento order and catalogue performance.", { auth: "api_key", extraMetrics: ["orders"] }),
  c("amazon-seller", "Amazon Seller Central", "E-commerce", "#ff9900", "Units ordered, sessions and buy box percentage.", { extraMetrics: ["units_ordered", "buy_box_pct"], extraDimensions: ["asin"] }),
  c("etsy", "Etsy", "E-commerce", "#f56400", "Shop listing views, favourites and orders.", { extraMetrics: ["orders", "favorites"] }),
  c("ebay", "eBay", "E-commerce", "#e53238", "Listing impressions, sales and fees.", { extraMetrics: ["orders"] }),
  c("squarespace-commerce", "Squarespace Commerce", "E-commerce", "#000000", "Store orders and product revenue.", { extraMetrics: ["orders"] }),
  c("prestashop", "PrestaShop", "E-commerce", "#df0067", "Store orders and catalogue metrics.", { auth: "api_key", extraMetrics: ["orders"] }),
  c("walmart-marketplace", "Walmart Marketplace", "E-commerce", "#0071dc", "Marketplace item sales and sponsored performance.", { extraMetrics: ["orders", "units_ordered"] }),

  // -------------------------------------------------------------- crm, sales
  c("hubspot", "HubSpot", "CRM & sales", "#ff7a59", "Deals, contacts, lifecycle stages and pipeline value.", { popular: true, extraMetrics: ["deals", "pipeline_value", "won_revenue"], extraDimensions: ["deal_stage", "owner"] }),
  c("salesforce", "Salesforce", "CRM & sales", "#00a1e0", "Opportunities, leads and campaign influence.", { popular: true, extraMetrics: ["opportunities", "pipeline_value", "won_revenue"], extraDimensions: ["stage", "owner"] }),
  c("pipedrive", "Pipedrive", "CRM & sales", "#017737", "Deal flow, activities and win rates.", { extraMetrics: ["deals", "pipeline_value"] }),
  c("zoho-crm", "Zoho CRM", "CRM & sales", "#e42527", "Leads, deals and module records."),
  c("dynamics-365", "Dynamics 365", "CRM & sales", "#002050", "Microsoft CRM opportunity and lead data."),
  c("close", "Close", "CRM & sales", "#3a4bc6", "Sales activity and opportunity reporting.", { auth: "api_key" }),
  c("copper", "Copper", "CRM & sales", "#ff3f2e", "Pipeline and activity metrics.", { auth: "api_key" }),
  c("intercom", "Intercom", "CRM & sales", "#1f8ded", "Conversations, resolutions and lead capture."),
  c("freshsales", "Freshsales", "CRM & sales", "#25c16f", "Deal and contact reporting.", { auth: "api_key" }),

  // ------------------------------------------------------------- email & sms
  c("klaviyo", "Klaviyo", "Email & SMS", "#232426", "Campaign and flow revenue, opens, clicks and unsubscribes.", { popular: true, auth: "api_key", extraMetrics: ["opens", "unsubscribes", "placed_orders"], extraDimensions: ["flow", "campaign_type"] }),
  c("mailchimp", "Mailchimp", "Email & SMS", "#ffe01b", "Campaign sends, opens, clicks and list growth.", { extraMetrics: ["opens", "unsubscribes"] }),
  c("sendgrid", "SendGrid", "Email & SMS", "#1a82e2", "Delivery, bounce and engagement stats.", { auth: "api_key", extraMetrics: ["opens", "bounces"] }),
  c("braze", "Braze", "Email & SMS", "#3accdd", "Cross-channel campaign and canvas performance.", { auth: "api_key", extraMetrics: ["opens"] }),
  c("activecampaign", "ActiveCampaign", "Email & SMS", "#356ae6", "Automation and campaign engagement.", { auth: "api_key", extraMetrics: ["opens"] }),
  c("customer-io", "Customer.io", "Email & SMS", "#7c3aed", "Message delivery and conversion metrics.", { auth: "api_key", extraMetrics: ["opens"] }),
  c("attentive", "Attentive", "Email & SMS", "#000000", "SMS subscriber growth and campaign revenue.", { auth: "api_key" }),
  c("postscript", "Postscript", "Email & SMS", "#1a1a1a", "Shopify SMS campaign and automation revenue.", { auth: "api_key" }),
  c("omnisend", "Omnisend", "Email & SMS", "#25b6a4", "E-commerce email and SMS automation metrics.", { auth: "api_key", extraMetrics: ["opens"] }),

  // --------------------------------------------------------------------- seo
  c("ahrefs", "Ahrefs", "SEO", "#ff8c42", "Backlinks, referring domains and keyword rankings.", { auth: "api_key", extraMetrics: ["backlinks", "referring_domains", "position"], extraDimensions: ["keyword"] }),
  c("semrush", "Semrush", "SEO", "#ff642d", "Organic positions, visibility and competitor gaps.", { auth: "api_key", extraMetrics: ["position", "visibility"], extraDimensions: ["keyword"] }),
  c("moz", "Moz", "SEO", "#00a3e0", "Domain authority and rank tracking.", { auth: "api_key", extraMetrics: ["position"] }),
  c("serpstat", "Serpstat", "SEO", "#4a90d9", "Keyword and SERP tracking.", { auth: "api_key", extraMetrics: ["position"] }),
  c("google-business-profile", "Google Business Profile", "SEO", "#34a853", "Local listing views, calls and direction requests.", { extraMetrics: ["calls", "direction_requests"] }),
  c("bing-webmaster", "Bing Webmaster Tools", "SEO", "#0078d4", "Organic clicks, impressions and positions.", { extraMetrics: ["position"], extraDimensions: ["query"] }),
  c("screaming-frog", "Screaming Frog", "SEO", "#3c8c3c", "Crawl exports and technical issue counts.", { auth: "file" }),

  // ------------------------------------------------------------ call tracking
  c("callrail", "CallRail", "Call tracking", "#00b0b9", "Calls, qualified calls and source attribution.", { auth: "api_key", extraMetrics: ["calls", "qualified_calls"] }),
  c("calltrackingmetrics", "CallTrackingMetrics", "Call tracking", "#0b6fb4", "Inbound call and form conversions.", { auth: "api_key", extraMetrics: ["calls"] }),
  c("invoca", "Invoca", "Call tracking", "#f04e37", "Call intelligence and conversion signals.", { auth: "api_key", extraMetrics: ["calls"] }),
  c("twilio", "Twilio", "Call tracking", "#f22f46", "Message and call volumes with spend.", { auth: "api_key", extraMetrics: ["calls", "messages"] }),

  // ------------------------------------------------- affiliate & attribution
  c("impact", "Impact", "Affiliate & attribution", "#0f62fe", "Partner and affiliate conversions with payout.", { auth: "api_key", extraMetrics: ["payout", "actions"] }),
  c("partnerstack", "PartnerStack", "Affiliate & attribution", "#1c1c1c", "Partner-sourced leads and commissions.", { auth: "api_key", extraMetrics: ["payout"] }),
  c("refersion", "Refersion", "Affiliate & attribution", "#00c389", "Affiliate order and commission tracking.", { auth: "api_key", extraMetrics: ["payout"] }),
  c("appsflyer", "AppsFlyer", "Affiliate & attribution", "#0d2ac3", "Mobile install attribution and in-app events.", { auth: "api_key", extraMetrics: ["installs"] }),
  c("adjust", "Adjust", "Affiliate & attribution", "#00c7b1", "App install and retention cohorts.", { auth: "api_key", extraMetrics: ["installs"] }),
  c("branch", "Branch", "Affiliate & attribution", "#5a2fd6", "Deep link and install attribution.", { auth: "api_key", extraMetrics: ["installs"] }),
  c("singular", "Singular", "Affiliate & attribution", "#1b1f3b", "Unified marketing and app measurement.", { auth: "api_key", extraMetrics: ["installs"] }),

  // -------------------------------------------------------- finance, billing
  c("stripe", "Stripe", "Finance & billing", "#635bff", "Charges, refunds, MRR and subscription movements.", { popular: true, auth: "api_key", extraMetrics: ["mrr", "refunds", "orders"] }),
  c("paypal", "PayPal", "Finance & billing", "#003087", "Transaction volume and fees.", { auth: "api_key", extraMetrics: ["orders", "fees"] }),
  c("chargebee", "Chargebee", "Finance & billing", "#ff3300", "Subscription billing and churn.", { auth: "api_key", extraMetrics: ["mrr", "churn_rate"] }),
  c("recharge", "Recharge", "Finance & billing", "#1c1c1c", "Subscription orders and retention.", { auth: "api_key", extraMetrics: ["mrr", "orders"] }),
  c("quickbooks", "QuickBooks", "Finance & billing", "#2ca01c", "Invoices, expenses and profit and loss."),
  c("xero", "Xero", "Finance & billing", "#13b5ea", "Accounting ledger and invoice data."),

  // ------------------------------------------------------------ productivity
  c("google-sheets-source", "Google Sheets", "Productivity", "#0f9d58", "Pull budgets, targets or offline sales from a sheet.", { popular: true }),
  c("csv-upload", "CSV upload", "Productivity", "#52607a", "Upload offline conversions or cost files.", { auth: "file" }),
  c("airtable", "Airtable", "Productivity", "#fcb400", "Base records as a reporting dimension."),
  c("notion", "Notion", "Productivity", "#000000", "Database records for campaign metadata."),
  c("asana", "Asana", "Productivity", "#f06a6a", "Project and task throughput."),
  c("jira", "Jira", "Productivity", "#0052cc", "Issue and sprint metrics."),
  c("zendesk", "Zendesk", "Productivity", "#03363d", "Ticket volume and resolution times."),
  c("typeform", "Typeform", "Productivity", "#262627", "Form responses and completion rate.", { auth: "api_key" }),
  c("calendly", "Calendly", "Productivity", "#006bff", "Meetings booked by source.", { extraMetrics: ["meetings"] }),
];

export const CONNECTORS_BY_SLUG: Record<string, Connector> = Object.fromEntries(
  CONNECTORS.map((x) => [x.slug, x]),
);

export const CATEGORIES: ConnectorCategory[] = [
  "Paid advertising",
  "Social media",
  "Web analytics",
  "E-commerce",
  "CRM & sales",
  "Email & SMS",
  "SEO",
  "Call tracking",
  "Affiliate & attribution",
  "Finance & billing",
  "Productivity",
];

/**
 * The catalogue ships with the connectors above fully modelled. The public
 * figure counts every regional and sub-account variant we expose through the
 * same API surface.
 */
export const TOTAL_SOURCE_COUNT = 325;

export type DestinationKind = "bi" | "warehouse" | "spreadsheet" | "api" | "storage";

export interface Destination {
  slug: string;
  name: string;
  kind: DestinationKind;
  color: string;
  tagline: string;
  /** How data lands there: push on a schedule, or pulled live by the tool. */
  delivery: "push" | "pull";
  setupFields: { key: string; label: string; placeholder: string; optional?: boolean }[];
}

export const DESTINATIONS: Destination[] = [
  {
    slug: "looker-studio",
    name: "Looker Studio",
    kind: "bi",
    color: "#4285f4",
    tagline: "Live community connector - build reports straight on your blended data.",
    delivery: "pull",
    setupFields: [{ key: "report_name", label: "Report name", placeholder: "Paid media overview" }],
  },
  {
    slug: "google-sheets",
    name: "Google Sheets",
    kind: "spreadsheet",
    color: "#0f9d58",
    tagline: "Scheduled refresh into a tab your team already lives in.",
    delivery: "push",
    setupFields: [
      { key: "spreadsheet_id", label: "Spreadsheet ID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" },
      { key: "sheet_name", label: "Tab name", placeholder: "adsconnect_raw" },
    ],
  },
  {
    slug: "bigquery",
    name: "BigQuery",
    kind: "warehouse",
    color: "#669df6",
    tagline: "Append or replace partitioned tables in your own project.",
    delivery: "push",
    setupFields: [
      { key: "project_id", label: "GCP project", placeholder: "acme-analytics" },
      { key: "dataset", label: "Dataset", placeholder: "marketing" },
      { key: "table", label: "Table", placeholder: "ads_daily" },
    ],
  },
  {
    slug: "snowflake",
    name: "Snowflake",
    kind: "warehouse",
    color: "#29b5e8",
    tagline: "Warehouse loads with schema evolution handled for you.",
    delivery: "push",
    setupFields: [
      { key: "account", label: "Account", placeholder: "xy12345.eu-west-1" },
      { key: "database", label: "Database", placeholder: "ANALYTICS" },
      { key: "schema", label: "Schema", placeholder: "MARKETING" },
    ],
  },
  {
    slug: "power-bi",
    name: "Power BI",
    kind: "bi",
    color: "#f2c811",
    tagline: "Connect with the OData feed and refresh on your own cadence.",
    delivery: "pull",
    setupFields: [{ key: "workspace", label: "Workspace", placeholder: "Marketing" }],
  },
  {
    slug: "tableau",
    name: "Tableau",
    kind: "bi",
    color: "#e8762d",
    tagline: "Web data connector for live extracts.",
    delivery: "pull",
    setupFields: [{ key: "site", label: "Site", placeholder: "acme" }],
  },
  {
    slug: "excel",
    name: "Excel",
    kind: "spreadsheet",
    color: "#217346",
    tagline: "Power Query against the REST endpoint, refreshed on open.",
    delivery: "pull",
    setupFields: [{ key: "workbook", label: "Workbook name", placeholder: "Weekly media report" }],
  },
  {
    slug: "postgres",
    name: "PostgreSQL",
    kind: "warehouse",
    color: "#336791",
    tagline: "Direct loads into any reachable Postgres instance.",
    delivery: "push",
    setupFields: [
      { key: "host", label: "Host", placeholder: "db.acme.internal" },
      { key: "database", label: "Database", placeholder: "analytics" },
      { key: "table", label: "Table", placeholder: "ads_daily" },
    ],
  },
  {
    slug: "redshift",
    name: "Amazon Redshift",
    kind: "warehouse",
    color: "#c925d1",
    tagline: "COPY loads via your own S3 staging bucket.",
    delivery: "push",
    setupFields: [
      { key: "cluster", label: "Cluster", placeholder: "acme-prod" },
      { key: "table", label: "Table", placeholder: "marketing.ads_daily" },
    ],
  },
  {
    slug: "s3",
    name: "Amazon S3",
    kind: "storage",
    color: "#ff9900",
    tagline: "Parquet or CSV drops on a schedule you control.",
    delivery: "push",
    setupFields: [
      { key: "bucket", label: "Bucket", placeholder: "acme-marketing-raw" },
      { key: "prefix", label: "Prefix", placeholder: "adsconnect/daily/" },
    ],
  },
  {
    slug: "rest-api",
    name: "REST API",
    kind: "api",
    color: "#2a78d6",
    tagline: "One JSON endpoint across every connected source.",
    delivery: "pull",
    setupFields: [],
  },
  {
    slug: "python",
    name: "Python / R",
    kind: "api",
    color: "#3776ab",
    tagline: "Pull straight into a notebook with pandas or httr.",
    delivery: "pull",
    setupFields: [],
  },
];

export const DESTINATIONS_BY_SLUG: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.slug, d]),
);
