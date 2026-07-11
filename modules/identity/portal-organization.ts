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

  return slugifyPortalOrg(PORTAL_NAME) || "client-declaration-portal";
}

export function getPortalOrganizationName() {
  return getServerEnv().PORTAL_ORG_NAME?.trim() || "iam-check";
}

export async function ensurePortalOrganization(): Promise<PortalOrganization> {
  const slug = getPortalOrganizationSlug();
  const name = getPortalOrganizationName();

  const { data: organizations, error: listError } =
    await auth.organization.list();

  if (listError) {
    throw new Error(
      listError.message ?? "Could not load Neon Auth organizations.",
    );
  }

  const existing =
    organizations?.find((organization) => organization.slug === slug) ??
    organizations?.[0];

  if (existing?.id) {
    await auth.organization.setActive({ organizationId: existing.id });
    return {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
    };
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

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
  };
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
