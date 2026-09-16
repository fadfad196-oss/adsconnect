"use client";

import { pathFor } from "./shared";

interface Props {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

/** Trend shape only; the tile beside it carries the number. */
export default function Sparkline({ values, color = "var(--series-1)", width = 120, height = 34 }: Props) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - 2 - ((v - min) / span) * (height - 4),
  }));

  return (
    <svg width={width} height={height} viewBox={"0 0 " + width + " " + height} aria-hidden="true">
      <path
        d={pathFor(points) + " L " + width + " " + height + " L 0 " + height + " Z"}
        fill={color}
        opacity={0.1}
      />
      <path d={pathFor(points)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
