import { redirect } from "next/navigation";
import { PortalEmptyStateCard } from "@/components/portal/portal-empty-state";
import { PortalCustomerShell } from "@/components/portal/portal-customer-shell";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  resolvePreviewUnavailableCopy,
  resolvePreviewUnavailableLandingHref,
} from "@/lib/preview-client";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";
import { EyeOffIcon } from "lucide-react";

export async function ClientPreviewUnavailableView({
  reason,
  embed,
}: {
  reason?: string;
  embed: boolean;
}) {
  const landing = await resolvePreviewUnavailableLandingHref({ embed });

  if (landing) {
    redirect(landing);
  }

  const copy = resolvePreviewUnavailableCopy(reason);

  if (embed) {
    return (
      <>
        <a href="#preview-content" className="portal-skip-link">
          {portalCopy.declarationPage.skipLink}
        </a>
        <main id="preview-content" className="portal-centered-state-embed">
          <PortalEmptyStateCard
            icon={EyeOffIcon}
            title={copy.title}
            description={copy.description}
          />
        </main>
      </>
    );
  }

  const { org } = portalCopy;

  return (
    <PortalCustomerShell
      variant="standalone"
      eyebrow={org.eyebrow}
      title={copy.title}
      description={copy.description}
      backHref={OPERATOR_DASHBOARD_HREF}
      backLabel={portalCopy.account.backToDashboard}
      contentWidth="narrow"
    />
  );
}
