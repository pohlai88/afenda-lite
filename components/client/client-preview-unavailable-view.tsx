import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PortalEmptyStateCard } from "@/components/portal/portal-empty-state";
import { PortalPageIntro } from "@/components/portal/portal-page-intro";
import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
import { portalCopy } from "@/lib/copy/portal-copy";
import {
  resolvePreviewUnavailableCopy,
  resolvePreviewUnavailableLandingHref,
} from "@/lib/preview-client";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";
import { Button } from "@/components/ui/button";
import { EyeOffIcon } from "lucide-react";
import { redirect } from "next/navigation";

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
    <div className="portal-shell">
      <a href="#preview-content" className="portal-skip-link">
        {portalCopy.declarationPage.skipLink}
      </a>

      <header className="portal-header">
        <div className="portal-header-inner portal-content-narrow">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-auto px-2 py-1 text-muted-foreground"
            render={<Link href={OPERATOR_DASHBOARD_HREF} />}
            nativeButton={false}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {portalCopy.account.backToDashboard}
          </Button>
          <PortalThemeToggle />
        </div>
      </header>

      <main
        id="preview-content"
        className="portal-main-narrow v-stack gap-6 sm:py-10"
      >
        <PortalPageIntro
          eyebrow={org.eyebrow}
          title={copy.title}
          description={copy.description}
        />
      </main>
    </div>
  );
}
