import { NextResponse } from "next/server";
import { QueryError, parseQueryInput, runQuery, toCsv } from "@/lib/query";
import { listConnections, userForApiKey } from "@/lib/store";

export const runtime = "nodejs";

/** Resolves the caller from ?api_key= or an Authorization: Bearer header. */
function authenticate(request: Request, params: URLSearchParams) {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const key = params.get("api_key") ?? bearer;
  if (!key) return { error: "Missing api_key." };
  const user = userForApiKey(key);
  if (!user) return { error: "Unknown api_key." };
  return { user };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = authenticate(request, url.searchParams);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const input = parseQueryInput(url.searchParams);
    if (!input.fields.length) {
      input.fields = ["date", "source", "campaign", "impressions", "clicks", "spend", "conversions", "revenue"];
    }
    const result = await runQuery(listConnections(auth.user.id), input);

    if ((url.searchParams.get("format") ?? "json") === "csv") {
      return new NextResponse(toCsv(result), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="adsconnect.csv"',
        },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Query failed." }, { status: 500 });
  }
}
