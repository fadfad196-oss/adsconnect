"use client";

import { useMemo, useRef, useState } from "react";
import { pathFor, seriesColor, ticks } from "./shared";
import { formatCompact, formatMetric } from "@/lib/format";

export interface LineSeries {
  key: string;
  label: string;
  /** Metric name used for formatting; defaults to the series key. */
  metric?: string;
}

export interface LinePoint {
  x: string;
  xLabel: string;
  values: Record<string, number>;
}

interface Props {
  data: LinePoint[];
  series: LineSeries[];
  height?: number;
  area?: boolean;
}

const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

/** Time series with a crosshair and a shared tooltip across every series. */
export default function LineChart({ data, series, height = 260, area = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;

  const max = useMemo(() => {
    let m = 0;
    for (const point of data) for (const s of series) m = Math.max(m, point.values[s.key] ?? 0);
    return m;
  }, [data, series]);

  const yTicks = ticks(max);
  const top = yTicks[yTicks.length - 1] || 1;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const xFor = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const yFor = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const fmt = (s: LineSeries, value: number) => formatMetric(s.metric ?? s.key, value);

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const x = ratio * width;
    if (data.length < 2) return setHover(0);
    const i = Math.round(((x - PAD.left) / innerW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const active = hover !== null ? data[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={"0 0 " + width + " " + height}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={series.map((s) => s.label).join(", ") + " over time"}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 10} y={yFor(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {data.map((point, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text key={point.x} x={xFor(i)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
              {point.xLabel}
            </text>
          ) : null,
        )}

        {series.map((s, si) => {
          const points = data.map((point, i) => ({ x: xFor(i), y: yFor(point.values[s.key] ?? 0) }));
          const color = seriesColor(si);
          return (
            <g key={s.key}>
              {area && series.length === 1 && points.length > 1 ? (
                <path
                  d={
                    pathFor(points) +
                    " L " + points[points.length - 1].x.toFixed(2) + " " + (PAD.top + innerH) +
                    " L " + points[0].x.toFixed(2) + " " + (PAD.top + innerH) + " Z"
                  }
                  fill={color}
                  opacity={0.1}
                />
              ) : null}
              <path d={pathFor(points)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {hover !== null && points[hover] ? (
                <circle cx={points[hover].x} cy={points[hover].y} r={4.5} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
              ) : null}
            </g>
          );
        })}

        {hover !== null ? (
          <line x1={xFor(hover)} x2={xFor(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" />
        ) : null}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-ink-200 bg-white p-2.5 text-xs shadow-lg"
          style={{
            left: "calc(" + ((xFor(hover!) / width) * 100).toFixed(2) + "% + 8px)",
            top: 8,
            transform: xFor(hover!) / width > 0.7 ? "translateX(-108%)" : undefined,
          }}
        >
          <div className="mb-1.5 font-medium text-ink-900">{active.xLabel}</div>
          {series.map((s, si) => (
            <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-ink-500">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: seriesColor(si) }} />
                {s.label}
              </span>
              <span className="font-medium tabular-nums text-ink-900">{fmt(s, active.values[s.key] ?? 0)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {series.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[52px] text-xs text-ink-500">
          {series.map((s, si) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: seriesColor(si) }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
