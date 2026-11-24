import { NextResponse } from "next/server";
import { buildClientStatePayload } from "@/lib/rules-engine";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId =
    url.searchParams.get("userId") ?? req.headers.get("x-user-id") ?? undefined;

  const db = await readDb();
  const payload = buildClientStatePayload(db, userId || undefined);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
