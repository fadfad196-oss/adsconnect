import { CONNECTORS_BY_SLUG } from "./catalog";
import {
  aggregate,
  fieldsFor,
  generateRows,
  isDimension,
  resolveRange,
  sortRows,
  type Row,
} from "./metrics";
import type { Connection } from "./store";

export interface QueryInput {
  fields: string[];
  connectors?: string[];
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  filters?: string[];
  orderBy?: string;
  limit?: number;
}

export interface QueryResult {
  meta: {
    date_from: string;
    date_to: string;
    fields: string[];
    connectors: string[];
    row_count: number;
  };
  data: Row[];
}

export class QueryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const OPERATORS = ["eq", "ne", "contains", "not_contains", "gt", "gte", "lt", "lte", "in"] as const;
type Operator = (typeof OPERATORS)[number];

interface Filter {
  field: string;
  operator: Operator;
  value: string;
}

function parseFilter(expression: string): Filter {
  const parts = expression.split(":");
  if (parts.length < 3) {
    throw new QueryError("Malformed filter '" + expression + "'. Use field:operator:value.");
  }
  const [field, operator, ...rest] = parts;
  if (!OPERATORS.includes(operator as Operator)) {
    throw new QueryError("Unknown filter operator '" + operator + "'. Supported: " + OPERATORS.join(", "));
  }
  return { field, operator: operator as Operator, value: rest.join(":") };
}

function matches(row: Row, filter: Filter): boolean {
  const raw = row[filter.field];
  if (raw === undefined) return false;

  if (typeof raw === "number") {
    const value = Number(filter.value);
    switch (filter.operator) {
      case "eq":
        return raw === value;
      case "ne":
        return raw !== value;
      case "gt":
        return raw > value;
      case "gte":
        return raw >= value;
      case "lt":
        return raw < value;
      case "lte":
        return raw <= value;
      case "in":
        return filter.value.split(",").map(Number).includes(raw);
      default:
        return String(raw).includes(filter.value);
    }
  }

  const text = String(raw).toLowerCase();
  const needle = filter.value.toLowerCase();
  switch (filter.operator) {
    case "eq":
      return text === needle;
    case "ne":
      return text !== needle;
    case "contains":
      return text.includes(needle);
    case "not_contains":
      return !text.includes(needle);
    case "in":
      return needle.split(",").map((v) => v.trim()).includes(text);
    default:
      return text === needle;
  }
}

/**
 * Shared query path for the public API, the data explorer and scheduled pipeline
 * runs, so all three return identical numbers for identical inputs.
 */
export function runQuery(connections: Connection[], input: QueryInput): QueryResult {
  if (!input.fields.length) {
    throw new QueryError("At least one field is required.");
  }

  const available = connections.filter((c) => c.status !== "paused");
  const requested = input.connectors?.filter(Boolean) ?? [];
  for (const slug of requested) {
    if (!CONNECTORS_BY_SLUG[slug]) throw new QueryError("Unknown connector '" + slug + "'.");
  }

  const selected = requested.length
    ? available.filter((c) => requested.includes(c.connector))
    : available;

  const slugs = [...new Set(selected.map((c) => c.connector))];
  const { dimensions, metrics } = fieldsFor(slugs);
  const known = new Set([...dimensions, ...metrics, "connector"]);

  for (const field of input.fields) {
    if (!known.has(field)) {
      throw new QueryError(
        "Unknown field '" + field + "' for the selected sources. See /docs for the field list.",
      );
    }
  }

  const { from, to } = resolveRange(input.datePreset, input.dateFrom, input.dateTo);
  if (from > to) throw new QueryError("date_from must be on or before date_to.");

  const accounts = Object.fromEntries(
    selected.map((c) => [c.connector, { id: c.accountId, name: c.accountName }]),
  );

  const needsAdLevel = input.fields.includes("ad");
  const needsAdGroup = needsAdLevel || input.fields.includes("adgroup");

  let rows = generateRows({
    connectors: slugs,
    accounts,
    from,
    to,
    granularity: needsAdLevel ? "ad" : needsAdGroup ? "adgroup" : "campaign",
  });

  for (const expression of input.filters ?? []) {
    const filter = parseFilter(expression);
    if (!known.has(filter.field)) {
      throw new QueryError("Cannot filter on unknown field '" + filter.field + "'.");
    }
    rows = rows.filter((row) => matches(row, filter));
  }

  const groupBy = input.fields.filter(isDimension);
  const selectedMetrics = input.fields.filter((field) => !isDimension(field));
  let result = aggregate(rows, groupBy, selectedMetrics);

  if (input.orderBy) {
    const descending = input.orderBy.startsWith("-");
    const field = descending ? input.orderBy.slice(1) : input.orderBy;
    if (!input.fields.includes(field)) {
      throw new QueryError("Cannot order by '" + field + "' because it is not in fields.");
    }
    result = sortRows(result, field, descending ? "desc" : "asc");
  } else if (groupBy.includes("date")) {
    result = sortRows(result, "date", "asc");
  } else if (selectedMetrics.length) {
    result = sortRows(result, selectedMetrics[0], "desc");
  }

  const limit = Math.min(Math.max(input.limit ?? 1000, 1), 50000);
  const limited = result.slice(0, limit);

  // Re-emit columns in the order the caller asked for them.
  const ordered = limited.map((row) => {
    const out: Row = {};
    for (const field of input.fields) out[field] = row[field] ?? (isDimension(field) ? "" : 0);
    return out;
  });

  return {
    meta: {
      date_from: from,
      date_to: to,
      fields: input.fields,
      connectors: slugs,
      row_count: ordered.length,
    },
    data: ordered,
  };
}

export function toCsv(result: QueryResult): string {
  const header = result.meta.fields.join(",");
  const lines = result.data.map((row) =>
    result.meta.fields
      .map((field) => {
        const value = row[field];
        if (typeof value === "number") return String(value);
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
      })
      .join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

export function parseQueryInput(params: URLSearchParams): QueryInput {
  const fields = (params.get("fields") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    fields,
    connectors: (params.get("connector") ?? params.get("connectors") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    datePreset: params.get("date_preset") ?? undefined,
    dateFrom: params.get("date_from") ?? undefined,
    dateTo: params.get("date_to") ?? undefined,
    filters: params.getAll("filter"),
    orderBy: params.get("order_by") ?? undefined,
    limit: params.get("limit") ? Number(params.get("limit")) : undefined,
  };
}
