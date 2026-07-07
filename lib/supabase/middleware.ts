import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { mapSupabaseUser } from "@/lib/supabase/session";
import type { PortalSessionUser } from "@/lib/supabase/session";

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  let response = NextResponse.next({
    request: requestHeaders
      ? new NextRequest(request.url, {
          headers: requestHeaders,
          method: request.method,
        })
      : request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: requestHeaders
              ? new NextRequest(request.url, {
                  headers: requestHeaders,
                  method: request.method,
                })
              : request,
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    response,
    user: user ? mapSupabaseUser(user) : null,
  };
}

export function redirectUnauthenticated(
  request: NextRequest,
  user: PortalSessionUser | null,
) {
  if (user) {
    return null;
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/playground")) {
    return NextResponse.redirect(
      new URL("/org/login?reason=access-denied", request.url),
    );
  }

  if (pathname.startsWith("/client") || pathname.startsWith("/account")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    pathname.startsWith("/survey") ||
    pathname.startsWith("/f/") ||
    pathname.startsWith("/invite/")
  ) {
    const loginUrl = new URL("/", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("reason", "login-required");
    return NextResponse.redirect(loginUrl);
  }

  return null;
}
