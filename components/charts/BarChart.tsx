"use client";

import { useState } from "react";
import { seriesColor, ticks } from "./shared";
import { formatCompact, formatMetric } from "@/lib/format";

export interface BarDatum {
  label: string;
  segments: { key: string; label: string; value: number }[];
}

interface Props {
  data: BarDatum[];
  height?: number;
  stacked?: boolean;
  /** Metric name used to format tooltip values. */
  metric?: string;
}

const PAD = { top: 16, right: 16, bottom: 34, left: 52 };

/** Vertical bars, stacked or grouped, with a per-bar hover tooltip. */
export default function BarChart({ data, height = 260, stacked = true, metric = "clicks" }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const seriesKeys = [...new Set(data.flatMap((d) => d.segments.map((s) => s.key)))];
  const maxValue = Math.max(
    1,
    ...data.map((d) =>
      stacked
        ? d.segments.reduce((a, s) => a + s.value, 0)
        : Math.max(...d.segments.map((s) => s.value), 0),
    ),
  );
  const yTicks = ticks(maxValue);
  const top = yTicks[yTicks.length - 1] || 1;
  const slot = innerW / Math.max(1, data.length);
  // Label every nth bar so ticks never collide on long windows.
  const labelEvery = Math.max(1, Math.ceil(data.length / 12));
  const barWidth = Math.min(46, slot * 0.62);
  const fmt = (value: number) => formatMetric(metric, value);

  return (
    <div className="relative w-full">
      <svg viewBox={"0 0 " + width + " " + height} className="w-full" style={{ height }} role="img">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH - (t / top) * innerH} y2={PAD.top + innerH - (t / top) * innerH} stroke="var(--grid)" />
            <text x={PAD.left - 10} y={PAD.top + innerH - (t / top) * innerH + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {data.map((datum, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const groupCount = stacked ? 1 : datum.segments.length;
          const groupWidth = barWidth / Math.max(1, groupCount);
          let cursor = PAD.top + innerH;

          return (
            <g key={datum.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {datum.segments.map((segment, si) => {
                const colorIndex = seriesKeys.indexOf(segment.key);
                const h = (segment.value / top) * innerH;
                if (stacked) {
                  cursor -= h;
                  const y = cursor;
                  // 2px surface gap keeps adjacent stacked segments legible.
                  return (
                    <rect
                      key={segment.key}
                      x={cx - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(0, h - 2)}
                      rx={si === datum.segments.length - 1 ? 4 : 0}
                      fill={seriesColor(colorIndex)}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  );
                }
                return (
                  <rect
                    key={segment.key}
                    x={cx - barWidth / 2 + groupWidth * si + 1}
                    y={PAD.top + innerH - h}
                    width={Math.max(1, groupWidth - 2)}
                    height={h}
                    rx={4}
                    fill={seriesColor(colorIndex)}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                );
              })}
              {i % labelEvery === 0 || i === data.length - 1 ? (
                <text x={cx} y={height - 12} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {datum.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg border border-ink-200 bg-white p-2.5 text-xs shadow-lg"
          style={{
            left: (((PAD.left + slot * hover + slot / 2) / width) * 100).toFixed(2) + "%",
            transform: hover / data.length > 0.66 ? "translateX(-105%)" : "translateX(8px)",
          }}
        >
          <div className="mb-1.5 font-medium text-ink-900">{data[hover].label}</div>
          {data[hover].segments.map((segment) => (
            <div key={segment.key} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-ink-500">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: seriesColor(seriesKeys.indexOf(segment.key)) }} />
                {segment.label}
              </span>
              <span className="font-medium tabular-nums text-ink-900">{fmt(segment.value)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {seriesKeys.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[52px] text-xs text-ink-500">
          {seriesKeys.map((key, i) => {
            const label = data.flatMap((d) => d.segments).find((s) => s.key === key)?.label ?? key;
            return (
              <span key={key} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: seriesColor(i) }} />
                {label}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
