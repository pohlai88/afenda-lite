import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight uptime probe — no env validation or dependency checks. */
export async function GET() {
  return NextResponse.json(
    {
      data: {
        status: "alive",
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
