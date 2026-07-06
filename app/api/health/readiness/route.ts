import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";

export async function GET() {
  const dbStatus = await checkDbConnection();
  const ready =
    Boolean(process.env.DATABASE_URL) &&
    Boolean(process.env.NEON_AUTH_BASE_URL) &&
    dbStatus === "Database connected";

  return NextResponse.json({
    data: {
      status: ready ? "ready" : "degraded",
      topology: "Next.js App Router with Neon Auth and Postgres",
      storage: dbStatus,
      auth: process.env.NEON_AUTH_BASE_URL ? "configured" : "missing",
      timestamp: new Date().toISOString(),
    },
  });
}
