import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const neonAuth = auth.middleware({
  loginUrl: "/",
});

export default async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const isEmbed = request.nextUrl.searchParams.get("embed") === "1";

  if (isEmbed) {
    requestHeaders.set("x-playground-embed", "1");
  }

  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  if (!isEmbed) {
    const authResponse = await neonAuth(modifiedRequest);
    if (authResponse) {
      return authResponse;
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/dashboard/:path*",
    "/client/:path*",
    "/org/:path*",
    "/survey/:path*",
    "/playground/:path*",
  ],
};
