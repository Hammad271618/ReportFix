import { NextResponse } from "next/server";
import { z } from "zod";
import { buildClientStatePayload } from "@/lib/rules-engine";
import { resetDb } from "@/lib/store";
import { parseJsonBody } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ResetSchema = z.object({
  mode: z.enum(["clean", "samples"]).optional().default("samples"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, ResetSchema);
  if (!parsed.ok) return parsed.response;

  const db = await resetDb(parsed.data.mode);
  const state = buildClientStatePayload(db);

  return NextResponse.json({
    ok: true,
    mode: parsed.data.mode,
    state,
  });
}
