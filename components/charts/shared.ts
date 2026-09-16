"use client";

/** Categorical slots come from the validated palette in globals.css, in fixed order. */
export const SERIES_SLOTS = 8;

export function seriesColor(index: number): string {
  return "var(--series-" + ((index % SERIES_SLOTS) + 1) + ")";
}

export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = Math.pow(10, exponent);
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

export function ticks(max: number, count = 4): number[] {
  const top = niceCeil(max);
  return Array.from({ length: count + 1 }, (_, i) => (top / count) * i);
}

export function pathFor(points: { x: number; y: number }[]): string {
  return points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(2) + " " + p.y.toFixed(2)).join(" ");
}
