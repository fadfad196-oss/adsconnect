"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DATE_PRESETS } from "@/lib/metrics";

/** Filters sit in one row above the charts and drive the URL, so views are shareable. */
export default function DateRangePicker({ paramName = "range" }: { paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramName) ?? "last_30d";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(paramName, value);
    router.push(pathname + "?" + next.toString());
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-500">Period</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {DATE_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
