import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { QueryError, parseQueryInput, runQuery, toCsv } from "@/lib/query";
import { listConnections } from "@/lib/store";

export const runtime = "nodejs";

/** Session-authenticated twin of /v1/all, used by the in-app data explorer. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(request.url);
  try {
    const result = runQuery(listConnections(user.id), parseQueryInput(url.searchParams));
    if (url.searchParams.get("format") === "csv") {
      return new NextResponse(toCsv(result), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="adsconnect-export.csv"',
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
