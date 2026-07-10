import type { ReactNode } from "react";
import {
  PortalShellHeader,
  toShellBreadcrumbs,
} from "@/components/portal/portal-application-shell";
import { PortalEyebrow } from "@/components/portal/portal-eyebrow";
import type { PortalBreadcrumb } from "@/components/portal/portal-breadcrumb-list";
import { isPlaygroundEmbedRequest } from "@/lib/playground/playground";

async function DashboardPageContent({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  embed,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs: PortalBreadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
  embed: boolean;
}) {
  if (embed) {
    return (
      <>
        <a href="#portal-main" className="portal-skip-link">
          Skip to main content
        </a>
        <main
          id="portal-main"
          className="v-stack mx-auto w-full min-w-0 flex-1 gap-6 overflow-x-clip p-4 md:p-6 lg:max-w-5xl"
        >
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <a href="#portal-main" className="portal-skip-link">
        Skip to main content
      </a>
      <PortalShellHeader breadcrumbs={toShellBreadcrumbs(breadcrumbs)} />
      <main
        id="portal-main"
        className="v-stack mx-auto w-full min-w-0 flex-1 gap-6 overflow-x-clip p-4 md:p-6 lg:max-w-5xl"
      >
        <header className="space-y-3">
          <PortalEyebrow>{eyebrow}</PortalEyebrow>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="portal-page-title">{title}</h1>
              {description ? (
                <p className="portal-page-description">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </header>
        {children}
      </main>
    </>
  );
}

export async function DashboardPage({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs: PortalBreadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const embed = await isPlaygroundEmbedRequest();

  return (
    <DashboardPageContent
      eyebrow={eyebrow}
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
      embed={embed}
    >
      {children}
    </DashboardPageContent>
  );
}

export function DashboardPageSkeleton({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
  embed = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs: PortalBreadcrumb[];
  children: ReactNode;
  embed?: boolean;
}) {
  if (embed) {
    return (
      <main
        id="portal-main"
        className="v-stack mx-auto w-full min-w-0 flex-1 gap-6 overflow-x-clip p-4 md:p-6 lg:max-w-5xl"
      >
        <header className="space-y-1">
          <PortalEyebrow className="mb-2">{eyebrow}</PortalEyebrow>
          <h1 className="portal-page-title">{title}</h1>
          {description ? (
            <p className="portal-page-description mt-1">{description}</p>
          ) : null}
        </header>
        {children}
      </main>
    );
  }

  return (
    <>
      <PortalShellHeader breadcrumbs={toShellBreadcrumbs(breadcrumbs)} />
      <main
        id="portal-main"
        className="v-stack mx-auto w-full min-w-0 flex-1 gap-6 overflow-x-clip p-4 md:p-6 lg:max-w-5xl"
      >
        <header className="space-y-1">
          <PortalEyebrow className="mb-2">{eyebrow}</PortalEyebrow>
          <h1 className="portal-page-title">{title}</h1>
          {description ? (
            <p className="portal-page-description mt-1">{description}</p>
          ) : null}
        </header>
        {children}
      </main>
    </>
  );
}

export { PortalSection } from "@/components/portal/portal-shell";
