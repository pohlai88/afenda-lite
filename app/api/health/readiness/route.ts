import { NextResponse } from "next/server";
import { checkDbConnection, getDatabaseConnectionMeta } from "@/lib/db";
import { getServerEnv } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getServerEnv();
  const dbStatus = await checkDbConnection();
  const connection = getDatabaseConnectionMeta();
  const requirePooler = process.env.NODE_ENV === "production";
  const ready =
    Boolean(env.DATABASE_URL) &&
    Boolean(env.NEON_AUTH_BASE_URL) &&
    dbStatus === "Database connected" &&
    (!requirePooler || connection.pooler);

  return NextResponse.json(
    {
      data: {
        status: ready ? "ready" : "degraded",
        topology: "Next.js App Router with Neon Auth and Postgres",
        storage: dbStatus,
        connection,
        auth: env.NEON_AUTH_BASE_URL ? "configured" : "missing",
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
