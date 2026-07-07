/**
 * Next.js 16 request proxy (replaces middleware.ts).
 * Neon Auth session validation and route protection for authenticated prefixes.
 * Playground embed requests bypass auth and receive the x-playground-embed header.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default async function proxy(request: NextRequest) {
  const isEmbed = request.nextUrl.searchParams.get("embed") === "1";

  if (isEmbed) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-playground-embed", "1");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return neonMiddleware(request);
}

/** Must cover all session-gated app routes; public routes stay outside the proxy. */
export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/dashboard/:path*",
    "/client/:path*",
    "/org/:path*",
    "/survey/:path*",
    "/f/:path*",
    "/invite/:path*",
    "/playground/:path*",
  ],
};
