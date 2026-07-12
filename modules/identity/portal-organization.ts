import "server-only";

import { auth } from "@/modules/identity/auth/server";
import { neonAuthServerFetch } from "@/modules/identity/auth/neon-auth-request";
import { getServerEnv } from "@/modules/platform/env/server";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";

export type PortalOrganization = {
  id: string;
  name: string;
  slug: string;
};

export class NoActiveOrganizationError extends Error {
  readonly code = "NO_ACTIVE_ORGANIZATION" as const;

  constructor(message = "No active organization in session.") {
    super(message);
    this.name = "NoActiveOrganizationError";
  }
}

function slugifyPortalOrg(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function getPortalOrganizationSlug() {
  const env = getServerEnv();
  const configured = env.PORTAL_ORG_SLUG?.trim();
  if (configured) {
    return slugifyPortalOrg(configured);
  }

  if (env.APP_URL) {
    try {
      const hostname = new URL(env.APP_URL).hostname;
      const label = hostname.split(".")[0];
      if (label && label !== "localhost") {
        return slugifyPortalOrg(label);
      }
    } catch {
      // fall through
    }
  }

  return slugifyPortalOrg(PORTAL_NAME) || "afenda-lite";
}

export function getPortalOrganizationName() {
  return getServerEnv().PORTAL_ORG_NAME?.trim() || "afenda-lite";
}

function readActiveOrganizationId(
  sessionPayload: unknown,
): string | null {
  if (
    !sessionPayload ||
    typeof sessionPayload !== "object" ||
    !("session" in sessionPayload)
  ) {
    return null;
  }
  return (
    (
      sessionPayload as {
        session?: { activeOrganizationId?: string | null };
      }
    ).session?.activeOrganizationId ?? null
  );
}

function toPortalOrganization(organization: {
  id: string;
  name: string;
  slug: string;
}): PortalOrganization {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };
}

async function listMemberOrganizations(): Promise<PortalOrganization[]> {
  const { data: organizations, error: listError } =
    await auth.organization.list();

  if (listError) {
    throw new Error(
      listError.message ?? "Could not load Neon Auth organizations.",
    );
  }

  return (organizations ?? [])
    .filter((organization) => Boolean(organization?.id))
    .map((organization) =>
      toPortalOrganization({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }),
    );
}

async function activateOrganization(
  organization: PortalOrganization,
  activeOrganizationId: string | null,
) {
  if (organization.id !== activeOrganizationId) {
    await auth.organization.setActive({ organizationId: organization.id });
  }
  return organization;
}

/**
 * Membership list for chrome (org switcher). Does not create or setActive.
 */
export async function listPortalOrganizations(): Promise<{
  organizations: PortalOrganization[];
  activeOrganizationId: string | null;
}> {
  const { data: sessionPayload } = await auth.getSession();
  const activeOrganizationId = readActiveOrganizationId(sessionPayload);
  const organizations = await listMemberOrganizations();
  return { organizations, activeOrganizationId };
}

/**
 * Fail-closed product resolve (M1 / D1):
 * active → slug → sole membership → create.
 * Never picks arbitrary organizations[0] when the member has more than one org.
 */
export async function resolveActivePortalOrganization(): Promise<PortalOrganization> {
  const slug = getPortalOrganizationSlug();
  const name = getPortalOrganizationName();

  const { data: sessionPayload } = await auth.getSession();
  const activeOrganizationId = readActiveOrganizationId(sessionPayload);
  const organizations = await listMemberOrganizations();

  const byActive = activeOrganizationId
    ? organizations.find(
        (organization) => organization.id === activeOrganizationId,
      )
    : undefined;
  if (byActive) {
    return byActive;
  }

  const bySlug = organizations.find(
    (organization) => organization.slug === slug,
  );
  if (bySlug) {
    return activateOrganization(bySlug, activeOrganizationId);
  }

  if (organizations.length === 1) {
    return activateOrganization(organizations[0], activeOrganizationId);
  }

  if (organizations.length > 1) {
    throw new NoActiveOrganizationError(
      "Session has multiple organizations but no active organization. Use the organization switcher.",
    );
  }

  const { data: created, error: createError } = await auth.organization.create({
    name,
    slug,
  });

  if (createError || !created?.id) {
    throw new Error(
      createError?.message ?? "Could not create the portal organization.",
    );
  }

  await auth.organization.setActive({ organizationId: created.id });

  return toPortalOrganization({
    id: created.id,
    name: created.name,
    slug: created.slug,
  });
}

/**
 * Bootstrap alias — same fail-closed resolve used by product adapters.
 * Prefer `resolveActivePortalOrganization` in new call sites.
 */
export async function ensurePortalOrganization(): Promise<PortalOrganization> {
  return resolveActivePortalOrganization();
}

export async function setActivePortalOrganization(organizationId: string) {
  const { organizations } = await listPortalOrganizations();
  const match = organizations.find(
    (organization) => organization.id === organizationId,
  );
  if (!match) {
    return {
      ok: false as const,
      code: "FORBIDDEN" as const,
      message: "Organization is not in your membership list.",
    };
  }

  await auth.organization.setActive({ organizationId: match.id });
  return { ok: true as const, data: match };
}

export async function inviteClientOrganizationMember(input: {
  email: string;
  organizationId: string;
}) {
  const delivery = await neonAuthServerFetch("organization/invite-member", {
    body: {
      email: input.email,
      role: "member",
      organizationId: input.organizationId,
      resend: true,
    },
  });

  if (!delivery.ok) {
    return {
      ok: false as const,
      error: delivery.error,
      status: delivery.status,
    };
  }

  return { ok: true as const, data: delivery.data };
}
