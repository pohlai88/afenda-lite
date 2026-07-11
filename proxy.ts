/**
 * Next.js 16 request proxy (replaces middleware.ts).
 * Neon Auth session validation and route protection for authenticated prefixes.
 * Playground embed requests bypass auth and receive the x-playground-embed header.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/identity/auth/server";
import {
  buildClientSignInEmbedRedirectPath,
  CLIENT_PREVIEW_UNAVAILABLE_HREF,
  CLIENT_SIGN_IN_ENTRY_HREF,
} from "@/modules/platform/routing/portal-routes";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default async function proxy(request: NextRequest) {
  const isEmbed = request.nextUrl.searchParams.get("embed") === "1";
  const pathname = request.nextUrl.pathname;
  const isPreviewUnavailableGate = pathname === CLIENT_PREVIEW_UNAVAILABLE_HREF;
  // Named client sign-in must stay public so reason/returnTo survive to the page.
  const isClientSignInEntry = pathname === CLIENT_SIGN_IN_ENTRY_HREF;

  // Playground primary scenario for client-named-login: HTTP 307 to Neon with embed.
  // Page-level redirect() soft-navigates (200 + meta) when loading.tsx streams.
  if (isClientSignInEntry && isEmbed) {
    const target = buildClientSignInEmbedRedirectPath({
      reason: request.nextUrl.searchParams.get("reason"),
    });
    return NextResponse.redirect(new URL(target, request.nextUrl.origin));
  }

  if (isEmbed) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-playground-embed", "1");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isPreviewUnavailableGate || isClientSignInEntry) {
    return NextResponse.next();
  }

  // Permanent product path: /trade/* → /fft/* (Hot Sales / trade identity retired).
  if (pathname === "/trade" || pathname.startsWith("/trade/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/trade/, "/fft");
    return NextResponse.redirect(url, 308);
  }

  // Server Actions authenticate in the action (requireAdminSession). Neon Auth
  // session cookies are SameSite=Strict; action POSTs are not document navigations,
  // so middleware can false-negative and return 307 to sign-in before the action runs.
  if (request.headers.has("next-action")) {
    return NextResponse.next();
  }

  return neonMiddleware(request);
}

/** Session-gated routes only. Public: `/` (Lynx landing), `/auth/*`, `/join`, `/org/login`, `/invite/*`, `/api/*`, `/survey/*`, `/f/*`. Auth embed uses `?embed=1` in-page (see resolvePlaygroundEmbedActive). */
export const config = {
  matcher: [
    "/account/:path*",
    "/dashboard/:path*",
    "/client/:path*",
    "/fft/:path*",
    "/trade",
    "/trade/:path*",
    "/playground/:path*",
  ],
};
