import { PortalNotFoundPage } from "@/features/portal-chrome/portal-not-found-page";
import {
  notFoundPageMetadata,
  resolveNotFoundDestination,
} from "@/lib/routing/not-found-routing";
import { portalCopy } from "@/lib/copy/portal-copy";

export const metadata = notFoundPageMetadata;

export default async function NotFound() {
  const { notFound } = portalCopy;
  const { backHref, backLabel } = await resolveNotFoundDestination();

  return (
    <PortalNotFoundPage
      title={notFound.title}
      description={notFound.description}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
