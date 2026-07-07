import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { isAdminSession } from "@/lib/admin";
import { PortalNotFoundPage } from "@/components/portal-not-found-page";
import { portalCopy } from "@/lib/portal-copy";

export default async function NotFound() {
  const { notFound } = portalCopy;
  const { data: session } = await auth.getSession();
  const isClient = Boolean(
    session?.user?.id && !isAdminSession(session),
  );
  const isOperator = isAdminSession(session);

  const backHref = isOperator
    ? "/dashboard"
    : isClient
      ? "/client"
      : "/auth/sign-in";
  const backLabel = isOperator
    ? notFound.backLabelOrg
    : isClient
      ? notFound.backLabelClient
      : notFound.backLabel;

  return (
    <PortalNotFoundPage
      title={notFound.title}
      description={notFound.description}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
