import { formatMetric, metricLabel } from "@/lib/format";
import { isDimension, type Row } from "@/lib/metrics";

interface Props {
  rows: Row[];
  columns: string[];
  emptyMessage?: string;
  maxHeight?: number;
}

/** The table view every chart falls back to, so figures are always readable. */
export default function DataTable({ rows, columns, emptyMessage = "No rows for this selection.", maxHeight }: Props) {
  if (!rows.length) {
    return <p className="px-5 py-10 text-center text-sm text-ink-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-auto scrollbar-thin" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-400">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className={"whitespace-nowrap px-4 py-2.5 font-medium " + (isDimension(column) ? "" : "text-right")}
              >
                {metricLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-ink-50">
              {columns.map((column) => {
                const value = row[column];
                const dimension = isDimension(column);
                return (
                  <td
                    key={column}
                    className={
                      "whitespace-nowrap px-4 py-2.5 " +
                      (dimension ? "text-ink-700" : "text-right tabular-nums text-ink-900")
                    }
                  >
                    {dimension ? String(value ?? "-") : formatMetric(column, Number(value ?? 0))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
