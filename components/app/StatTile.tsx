import Sparkline from "@/components/charts/Sparkline";
import { LOWER_IS_BETTER, formatMetric, metricLabel, percentChange } from "@/lib/format";

interface Props {
  metric: string;
  value: number;
  previous?: number;
  trend?: number[];
  label?: string;
}

/**
 * Hero number first, trend second. The delta carries an arrow and a word, so the
 * direction is never conveyed by colour alone.
 */
export default function StatTile({ metric, value, previous, trend, label }: Props) {
  const change = previous === undefined ? null : percentChange(value, previous);
  const improving = change === null ? null : LOWER_IS_BETTER.has(metric) ? change < 0 : change > 0;

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="text-xs font-medium text-ink-500">{label ?? metricLabel(metric)}</div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink-900">
            {formatMetric(metric, value)}
          </div>
          {change !== null ? (
            <div
              className="mt-1 flex items-center gap-1 text-xs font-medium"
              style={{ color: improving ? "var(--status-good)" : "var(--status-bad)" }}
            >
              <span aria-hidden="true">{change >= 0 ? "▲" : "▼"}</span>
              {Math.abs(change).toFixed(1)}%
              <span className="font-normal text-ink-400">vs previous period</span>
            </div>
          ) : null}
        </div>
        {trend && trend.length > 2 ? (
          <Sparkline values={trend} color={improving === false ? "var(--series-2)" : "var(--series-1)"} />
        ) : null}
      </div>
    </div>
  );
}
