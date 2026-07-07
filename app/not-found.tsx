import { PortalNotFoundPage } from "@/components/portal-not-found-page";
import {
  notFoundPageMetadata,
  resolveNotFoundDestination,
} from "@/lib/not-found-routing";
import { portalCopy } from "@/lib/portal-copy";

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
