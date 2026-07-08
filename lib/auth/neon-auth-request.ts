import "server-only";

import { headers } from "next/headers";
import { getAppBaseUrl } from "@/lib/app-url";
import { readNeonAuthEnv } from "@/lib/auth/env";

/** Must match @neondatabase/auth/next/server — not the legacy x-neon-auth-server-proxy name. */
const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-proxy";
const NEON_AUTH_COOKIE_PREFIX = "__Secure-neon-auth";

type NeonAuthServerFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; status?: number };

function parseCookieHeader(cookieHeader: string) {
  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    cookies.set(name, value);
  }
  return cookies;
}

/** Neon Auth server API only accepts session cookies with this prefix. */
export function extractNeonAuthCookieHeader(cookieHeader: string) {
  if (!cookieHeader) {
    return "";
  }

  const parsedCookies = parseCookieHeader(cookieHeader);
  const result: string[] = [];
  for (const [name, value] of parsedCookies.entries()) {
    if (name.startsWith(NEON_AUTH_COOKIE_PREFIX)) {
      result.push(`${name}=${value}`);
    }
  }

  return result.join("; ");
}

/**
 * Server-side Neon Auth fetch that always sends Origin/Referer from APP_URL.
 * The SDK uses the incoming browser Origin, which breaks org invitation emails
 * when operators invite from localhost while APP_URL points at production.
 */
export async function neonAuthServerFetch(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  } = {},
): Promise<NeonAuthServerFetchResult> {
  const { baseUrl } = readNeonAuthEnv();
  const headerStore = await headers();
  const cookieHeader = extractNeonAuthCookieHeader(
    headerStore.get("cookie") ?? "",
  );
  const appOrigin = getAppBaseUrl();

  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  const response = await fetch(url.toString(), {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Origin: appOrigin,
      Referer: `${appOrigin}/`,
      [NEON_AUTH_SERVER_PROXY_HEADER]: "nextjs",
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const message =
      (parsed as { message?: string })?.message ??
      (parsed as { error?: string })?.error ??
      `Neon Auth ${path} failed (${response.status})`;
    return { ok: false, error: message, status: response.status };
  }

  return { ok: true, data: parsed };
}
