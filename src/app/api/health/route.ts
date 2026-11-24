import { NextResponse } from "next/server";
import { readDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const geminiConfigured = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  try {
    const db = await readDb();
    return NextResponse.json({
      ok: true,
      storage: "local-json",
      usersCount: db.users.length,
      issuesCount: db.issues.length,
      geminiConfigured,
      model: "gemini-3.8-flash",
      timestamp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        storage: "error",
        geminiConfigured,
        error: message,
        timestamp,
      },
      { status: 500 }
    );
  }
}
