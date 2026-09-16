import { CONNECTORS_BY_SLUG, type ConnectorCategory } from "./catalog";
import { eachDate } from "./metrics";

/**
 * Only sources that can actually acquire a visit count as touchpoints. A store or
 * analytics connector measures the conversion, it does not earn credit for it.
 */
const ACQUISITION_CATEGORIES: ConnectorCategory[] = [
  "Paid advertising",
  "Social media",
  "Email & SMS",
  "SEO",
  "Affiliate & attribution",
];

export function attributionChannels(slugs: string[]): string[] {
  return [...new Set(slugs)].filter((slug) => {
    const connector = CONNECTORS_BY_SLUG[slug];
    return connector ? ACQUISITION_CATEGORIES.includes(connector.category) : false;
  });
}

export const ATTRIBUTION_MODELS = [
  { id: "last_click", label: "Last click", blurb: "All credit to the final paid touch before the conversion." },
  { id: "last_non_direct", label: "Last non-direct", blurb: "Skips direct sessions and credits the last marketing touch." },
  { id: "first_click", label: "First click", blurb: "All credit to the touch that started the journey." },
  { id: "linear", label: "Linear", blurb: "Credit split evenly across every touch in the path." },
  { id: "time_decay", label: "Time decay", blurb: "Touches closer to the conversion get exponentially more credit (7 day half-life)." },
  { id: "position_based", label: "Position based", blurb: "40% first, 40% last, 20% spread across the middle." },
  { id: "markov", label: "Data driven (Markov)", blurb: "Removal effect on a Markov chain built from your real paths." },
] as const;

export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number]["id"];

export interface Touch {
  channel: string;
  /** Days before the conversion. */
  daysBefore: number;
}

export interface Journey {
  id: string;
  convertedOn: string;
  revenue: number;
  path: Touch[];
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

/** How likely a channel is to appear early vs. late in a path. */
const CHANNEL_BIAS: Record<string, { entry: number; assist: number; closer: number }> = {
  "facebook-ads": { entry: 1.5, assist: 1.2, closer: 0.7 },
  "instagram-ads": { entry: 1.4, assist: 1.1, closer: 0.6 },
  "tiktok-ads": { entry: 1.8, assist: 0.9, closer: 0.4 },
  "youtube-analytics": { entry: 1.7, assist: 0.8, closer: 0.3 },
  "pinterest-ads": { entry: 1.3, assist: 0.9, closer: 0.5 },
  "google-ads": { entry: 0.9, assist: 1.1, closer: 1.6 },
  "microsoft-ads": { entry: 0.8, assist: 1.0, closer: 1.4 },
  "google-search-console": { entry: 1.1, assist: 1.0, closer: 1.2 },
  "amazon-ads": { entry: 0.7, assist: 0.8, closer: 1.8 },
  klaviyo: { entry: 0.4, assist: 1.4, closer: 1.5 },
  "linkedin-ads": { entry: 1.2, assist: 1.2, closer: 0.9 },
  Direct: { entry: 0.5, assist: 0.8, closer: 1.9 },
};

function bias(channel: string) {
  return CHANNEL_BIAS[channel] ?? { entry: 1, assist: 1, closer: 1 };
}

export function channelLabel(channel: string): string {
  if (channel === "Direct") return "Direct";
  return CONNECTORS_BY_SLUG[channel]?.name ?? channel;
}

function weightedPick(channels: string[], weights: number[], r: number): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const target = r * total;
  for (let i = 0; i < channels.length; i++) {
    acc += weights[i];
    if (target <= acc) return channels[i];
  }
  return channels[channels.length - 1];
}

export interface JourneyOptions {
  channels: string[];
  from: string;
  to: string;
  /** Conversions per day across all channels. */
  volume?: number;
}

/** Synthesises the multi-touch paths the attribution models are computed from. */
export function generateJourneys(opts: JourneyOptions): Journey[] {
  const channels = [...opts.channels.filter((c) => c !== "Direct"), "Direct"];
  if (channels.length < 2) return [];
  const dates = eachDate(opts.from, opts.to);
  const perDay = opts.volume ?? 26;
  const journeys: Journey[] = [];

  for (const date of dates) {
    const rd = rng("journeys:" + date + ":" + channels.join(","));
    const count = Math.max(1, Math.round(perDay * (0.75 + rd() * 0.5)));
    for (let i = 0; i < count; i++) {
      const r = rng("journey:" + date + ":" + i + ":" + channels.length);
      const draw = r();
      // Path length distribution: most conversions take 1-3 touches.
      const length = draw < 0.34 ? 1 : draw < 0.62 ? 2 : draw < 0.82 ? 3 : draw < 0.94 ? 4 : 5;
      const path: Touch[] = [];
      let daysBefore = Math.floor(r() * 21);

      for (let step = 0; step < length; step++) {
        const isFirst = step === 0;
        const isLast = step === length - 1;
        const weights = channels.map((c) => {
          const b = bias(c);
          return isLast ? b.closer : isFirst ? b.entry : b.assist;
        });
        let channel = weightedPick(channels, weights, r());
        // Avoid immediate self-repeats, they add nothing to the chain.
        if (path.length && path[path.length - 1].channel === channel) {
          channel = weightedPick(
            channels.filter((c) => c !== channel),
            weights.filter((_, idx) => channels[idx] !== channel),
            r(),
          );
        }
        path.push({ channel, daysBefore });
        daysBefore = Math.max(0, daysBefore - Math.floor(r() * 7));
      }

      journeys.push({
        id: date + "-" + i,
        convertedOn: date,
        revenue: Math.round((45 + r() * 260) * 100) / 100,
        path,
      });
    }
  }
  return journeys;
}

export interface Credit {
  channel: string;
  conversions: number;
  revenue: number;
}

function emptyCredits(channels: string[]): Map<string, Credit> {
  return new Map(channels.map((c) => [c, { channel: c, conversions: 0, revenue: 0 }]));
}

function add(credits: Map<string, Credit>, channel: string, conv: number, rev: number) {
  const entry = credits.get(channel) ?? { channel, conversions: 0, revenue: 0 };
  entry.conversions += conv;
  entry.revenue += rev;
  credits.set(channel, entry);
}

/** Splits every journey's conversion and revenue across channels under one model. */
export function attribute(journeys: Journey[], model: AttributionModel): Credit[] {
  const channels = [...new Set(journeys.flatMap((j) => j.path.map((t) => t.channel)))];
  const credits = emptyCredits(channels);

  if (model === "markov") {
    return markovAttribution(journeys, channels);
  }

  for (const j of journeys) {
    const path = j.path;
    const weights = shareOfCredit(path, model);
    weights.forEach((w, idx) => {
      if (w <= 0) return;
      add(credits, path[idx].channel, w, w * j.revenue);
    });
  }

  return finalise(credits);
}

function shareOfCredit(path: Touch[], model: AttributionModel): number[] {
  const n = path.length;
  if (n === 0) return [];

  switch (model) {
    case "first_click": {
      const w = new Array(n).fill(0);
      w[0] = 1;
      return w;
    }
    case "last_click": {
      const w = new Array(n).fill(0);
      w[n - 1] = 1;
      return w;
    }
    case "last_non_direct": {
      const w = new Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        if (path[i].channel !== "Direct") {
          w[i] = 1;
          return w;
        }
      }
      w[n - 1] = 1; // Direct-only path keeps its credit rather than vanishing.
      return w;
    }
    case "linear":
      return new Array(n).fill(1 / n);
    case "time_decay": {
      const halfLife = 7;
      const raw = path.map((t) => Math.pow(2, -t.daysBefore / halfLife));
      const total = raw.reduce((a, b) => a + b, 0) || 1;
      return raw.map((x) => x / total);
    }
    case "position_based": {
      if (n === 1) return [1];
      if (n === 2) return [0.5, 0.5];
      const middle = 0.2 / (n - 2);
      return path.map((_, i) => (i === 0 || i === n - 1 ? 0.4 : middle));
    }
    default:
      return new Array(n).fill(1 / n);
  }
}

/* ------------------------------------------------------------------- Markov */

interface Chain {
  /** transitions[from][to] = probability */
  transitions: Map<string, Map<string, number>>;
}

const START = "(start)";
const CONV = "(conversion)";
const NULL_STATE = "(null)";

function buildChain(journeys: Journey[], excluded?: string): Chain {
  const counts = new Map<string, Map<string, number>>();
  const bump = (from: string, to: string) => {
    let row = counts.get(from);
    if (!row) counts.set(from, (row = new Map()));
    row.set(to, (row.get(to) ?? 0) + 1);
  };

  for (const j of journeys) {
    const steps = j.path.map((t) => t.channel).filter((c) => c !== excluded);
    if (excluded && steps.length !== j.path.length) {
      // Removing the channel can break the path entirely.
      if (steps.length === 0) {
        bump(START, NULL_STATE);
        continue;
      }
    }
    let prev = START;
    for (const step of steps) {
      bump(prev, step);
      prev = step;
    }
    bump(prev, CONV);
  }

  const transitions = new Map<string, Map<string, number>>();
  for (const [from, row] of counts) {
    const total = [...row.values()].reduce((a, b) => a + b, 0) || 1;
    transitions.set(from, new Map([...row].map(([to, n]) => [to, n / total])));
  }
  return { transitions };
}

/** Probability of reaching conversion from start, by power iteration over the chain. */
function conversionProbability(chain: Chain): number {
  let state = new Map<string, number>([[START, 1]]);
  let converted = 0;
  for (let step = 0; step < 40; step++) {
    const next = new Map<string, number>();
    let moved = 0;
    for (const [node, mass] of state) {
      if (mass <= 1e-9) continue;
      const row = chain.transitions.get(node);
      if (!row) continue;
      for (const [to, p] of row) {
        const delta = mass * p;
        if (to === CONV) {
          converted += delta;
        } else if (to !== NULL_STATE) {
          next.set(to, (next.get(to) ?? 0) + delta);
          moved += delta;
        }
      }
    }
    state = next;
    if (moved <= 1e-9) break;
  }
  return converted;
}

function markovAttribution(journeys: Journey[], channels: string[]): Credit[] {
  const totalConversions = journeys.length;
  const totalRevenue = journeys.reduce((a, j) => a + j.revenue, 0);
  const baseline = conversionProbability(buildChain(journeys));
  const credits = emptyCredits(channels);

  const removalEffects: Record<string, number> = {};
  let sum = 0;
  for (const channel of channels) {
    const without = conversionProbability(buildChain(journeys, channel));
    const effect = baseline > 0 ? Math.max(0, (baseline - without) / baseline) : 0;
    removalEffects[channel] = effect;
    sum += effect;
  }

  for (const channel of channels) {
    const share = sum > 0 ? removalEffects[channel] / sum : 1 / channels.length;
    add(credits, channel, share * totalConversions, share * totalRevenue);
  }
  return finalise(credits);
}

function finalise(credits: Map<string, Credit>): Credit[] {
  return [...credits.values()]
    .map((c) => ({
      channel: c.channel,
      conversions: Math.round(c.conversions * 100) / 100,
      revenue: Math.round(c.revenue * 100) / 100,
    }))
    .sort((a, b) => b.conversions - a.conversions);
}

/** Most common paths, for the journey table. */
export function topPaths(journeys: Journey[], limit = 8) {
  const counts = new Map<string, { path: string[]; conversions: number; revenue: number }>();
  for (const j of journeys) {
    const path = j.path.map((t) => t.channel);
    const key = path.join(" > ");
    const entry = counts.get(key) ?? { path, conversions: 0, revenue: 0 };
    entry.conversions += 1;
    entry.revenue += j.revenue;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit)
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));
}

export function pathLengthDistribution(journeys: Journey[]) {
  const buckets = new Map<number, number>();
  for (const j of journeys) {
    const n = Math.min(j.path.length, 5);
    buckets.set(n, (buckets.get(n) ?? 0) + 1);
  }
  return [1, 2, 3, 4, 5].map((n) => ({
    touches: n,
    label: n === 5 ? "5+" : String(n),
    conversions: buckets.get(n) ?? 0,
  }));
}
