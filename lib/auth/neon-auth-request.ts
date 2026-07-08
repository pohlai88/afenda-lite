import "server-only";

import { headers } from "next/headers";
import { getAppBaseUrl } from "@/lib/app-url";
import { readNeonAuthEnv } from "@/lib/auth/env";

const NEON_AUTH_SERVER_PROXY_HEADER = "x-neon-auth-server-proxy";

type NeonAuthServerFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

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
  const cookieHeader = headerStore.get("cookie") ?? "";
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
    return { ok: false, error: message };
  }

  return { ok: true, data: parsed };
}
