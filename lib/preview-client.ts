import "server-only";

import type { Metadata } from "next";
import {
  getPreviewClientEmail as readPreviewClientEmail,
  getPreviewClientName as readPreviewClientName,
  getPreviewClientPassword as readPreviewClientPassword,
  isPreviewClientConfigured as readPreviewClientConfigured,
} from "@/lib/env/accessors";
import { isPlaygroundEmbedRequest } from "@/lib/playground/playground";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { getNeonAuthUserByEmail } from "@/lib/domain/neon-auth-users";
import {
  CLIENT_HOME_HREF,
  CLIENT_PREVIEW_UNAVAILABLE_HREF,
  OPERATOR_DASHBOARD_HREF,
} from "@/lib/routing/portal-routes";

type PreviewSession = {
  user?: {
    email?: string | null;
  };
} | null | undefined;

export const PREVIEW_UNAVAILABLE_FAILED_REASON = "failed" as const;

export const previewUnavailablePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.previewUnavailable.title}`,
  description: portalCopy.metadata.previewUnavailable.description,
};

export function isPreviewUnavailableFailedReason(value: string | undefined) {
  return value === PREVIEW_UNAVAILABLE_FAILED_REASON;
}

export function resolvePreviewUnavailableCopy(reason?: string) {
  const { previewClient } = portalCopy;

  if (isPreviewUnavailableFailedReason(reason)) {
    return {
      title: previewClient.notConfiguredTitle,
      description: previewClient.signInFailed,
    };
  }

  return {
    title: previewClient.notConfiguredTitle,
    description: previewClient.notConfigured,
  };
}

export async function resolvePreviewEmbedFlag(
  searchParams: Promise<{ embed?: string }>,
) {
  const { embed: embedParam } = await searchParams;
  return embedParam === "1" || (await isPlaygroundEmbedRequest());
}

export function getPreviewClientEmail() {
  return readPreviewClientEmail();
}

export function getPreviewClientPassword() {
  return readPreviewClientPassword();
}

export function isPreviewClientConfigured() {
  return readPreviewClientConfigured();
}

export function isPreviewClientSession(session: PreviewSession) {
  const previewEmail = getPreviewClientEmail();
  if (!previewEmail || !session?.user?.email) {
    return false;
  }

  return session.user.email.trim().toLowerCase() === previewEmail;
}

export function getPreviewClientName() {
  return readPreviewClientName();
}

export async function getPreviewClientUser() {
  const email = getPreviewClientEmail();
  if (!email) {
    return null;
  }

  const user = await getNeonAuthUserByEmail(email);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name?.trim() || getPreviewClientName(),
  };
}

export async function getNeonAuthUserIdByEmail(email: string) {
  const user = await getNeonAuthUserByEmail(email);
  return user?.id ?? null;
}

export function clientPreviewUnavailableHref(options?: {
  embed?: boolean;
  reason?: string;
}) {
  const params = new URLSearchParams();
  if (options?.embed) {
    params.set("embed", "1");
  }
  if (options?.reason) {
    params.set("reason", options.reason);
  }

  const query = params.toString();
  return query
    ? `${CLIENT_PREVIEW_UNAVAILABLE_HREF}?${query}`
    : CLIENT_PREVIEW_UNAVAILABLE_HREF;
}

export function clientHomeHref(options?: { embed?: boolean }) {
  if (!options?.embed) {
    return CLIENT_HOME_HREF;
  }

  return `${CLIENT_HOME_HREF}?embed=1`;
}

/** Preview sandbox account exists and is reachable in Neon Auth. */
export async function isPreviewClientReady() {
  if (!isPreviewClientConfigured()) {
    return false;
  }

  const user = await getPreviewClientUser();
  return Boolean(user);
}

export async function resolvePreviewUnavailableLandingHref(options?: {
  embed?: boolean;
}) {
  // Playground embeds iframe this gate for layout review — never redirect away.
  if (options?.embed) {
    return null;
  }

  if (!(await isPreviewClientReady())) {
    return null;
  }

  return OPERATOR_DASHBOARD_HREF;
}

/** Shared page handler for `/client/preview-unavailable`. */
export async function runPreviewUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; reason?: string }>;
}) {
  const [{ reason }, embed] = await Promise.all([
    searchParams,
    resolvePreviewEmbedFlag(searchParams),
  ]);

  return { reason, embed };
}
