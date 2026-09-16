"use client";

import { useState } from "react";
import { seriesColor } from "./shared";
import { formatMetric } from "@/lib/format";

export interface Slice {
  label: string;
  value: number;
}

interface Props {
  data: Slice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  /** Metric name used to format slice values. */
  metric?: string;
}

/** Share-of-total donut. Slices beyond eight fold into "Other" rather than cycling hues. */
export default function DonutChart({ data, size = 190, centerLabel, centerValue, metric = "spend" }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  // A zero slice draws nothing but still eats a legend row, so drop it.
  const sorted = [...data].filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);
  const slices =
    sorted.length > 8
      ? [...sorted.slice(0, 7), { label: "Other", value: sorted.slice(7).reduce((a, s) => a + s.value, 0) }]
      : sorted;

  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const radius = size / 2;
  const stroke = size * 0.17;
  const r = radius - stroke / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const fmt = (value: number) => formatMetric(metric, value);

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} role="img" aria-label="Share of total">
        <g transform={"rotate(-90 " + radius + " " + radius + ")"}>
          {slices.map((slice, i) => {
            const fraction = slice.value / total;
            const length = fraction * circumference;
            const dash = Math.max(0, length - 2); // 2px surface gap between slices
            const element = (
              <circle
                key={slice.label}
                cx={radius}
                cy={radius}
                r={r}
                fill="none"
                stroke={seriesColor(i)}
                strokeWidth={hover === i ? stroke + 4 : stroke}
                strokeDasharray={dash + " " + (circumference - dash)}
                strokeDashoffset={-offset}
                opacity={hover === null || hover === i ? 1 : 0.45}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: "stroke-width 120ms ease" }}
              />
            );
            offset += length;
            return element;
          })}
        </g>
        <text x={radius} y={radius - 4} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
          {hover !== null ? slices[hover].label.slice(0, 18) : centerLabel}
        </text>
        <text x={radius} y={radius + 16} textAnchor="middle" fontSize={17} fontWeight={600} fill="var(--text-primary)">
          {hover !== null ? fmt(slices[hover].value) : centerValue}
        </text>
      </svg>

      <ul className="min-w-44 flex-1 space-y-1.5 text-sm">
        {slices.map((slice, i) => (
          <li
            key={slice.label}
            className="flex items-center justify-between gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="flex items-center gap-2 text-ink-500">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: seriesColor(i) }} />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="tabular-nums font-medium text-ink-900">
              {((slice.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
