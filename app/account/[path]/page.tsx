import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAccountSession } from "@/lib/account-session";
import { PortalAccountSectionNav } from "@/components/portal-account-section-nav";
import { PortalAccountShell } from "@/components/portal-account-shell";
import { PortalFormSection } from "@/components/portal-form-section";
import { PortalNeonAccountView } from "@/components/portal-neon-view";
import {
  accountCopyKey,
  isPortalAccountPath,
  PORTAL_ACCOUNT_PATHS,
} from "@/lib/account-paths";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";

export const dynamicParams = false;

export function generateStaticParams() {
  return PORTAL_ACCOUNT_PATHS.map((path) => ({ path }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path } = await params;

  if (path === "security") {
    return {
      title: `${PORTAL_NAME} — ${portalCopy.metadata.accountSecurity.title}`,
      description: portalCopy.metadata.accountSecurity.description,
    };
  }

  return {
    title: `${PORTAL_NAME} — ${portalCopy.metadata.accountSettings.title}`,
    description: portalCopy.metadata.accountSettings.description,
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  if (!isPortalAccountPath(path)) {
    notFound();
  }

  const member = await requireAccountSession();
  const copy = portalCopy.account[accountCopyKey(path)];

  return (
    <PortalAccountShell member={member}>
      <PortalFormSection
        headingLevel={1}
        title={copy.title}
        description={copy.description}
      >
        <div className="portal-neon-view">
          <PortalNeonAccountView pathname={path} />
        </div>
      </PortalFormSection>
      <PortalAccountSectionNav activePath={path} />
    </PortalAccountShell>
  );
}
