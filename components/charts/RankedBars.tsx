"use client";

import { seriesColor } from "./shared";
import { formatMetric } from "@/lib/format";

interface Props {
  data: { label: string; value: number; sub?: string }[];
  metric: string;
  /** Only set this where each row is a distinct entity carried elsewhere in the page. */
  colorByIndex?: boolean;
}

/** Horizontal ranked bars with a direct label on every row, so no legend is needed. */
export default function RankedBars({ data, metric, colorByIndex = false }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-700">{d.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-ink-900">{formatMetric(metric, d.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full"
              style={{ width: Math.max(2, (d.value / max) * 100) + "%", background: colorByIndex ? seriesColor(i) : "var(--series-1)" }}
            />
          </div>
          {d.sub ? <div className="mt-1 text-xs text-ink-400">{d.sub}</div> : null}
        </li>
      ))}
    </ul>
  );
}
