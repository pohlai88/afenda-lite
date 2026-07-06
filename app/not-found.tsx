import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { isAdminSession } from "@/lib/admin";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Button } from "@/components/ui/button";
import { portalCopy } from "@/lib/portal-copy";

export default async function NotFound() {
  const { notFound, product } = portalCopy;
  const { data: session } = await auth.getSession();
  const isClient =
    session?.user?.id && !isAdminSession(session);

  const backHref = isClient ? "/client" : "/";
  const backLabel = isClient
    ? notFound.backLabelClient
    : notFound.backLabel;

  return (
    <PortalCustomerShell
      eyebrow={product.portalEyebrow}
      title={notFound.title}
      description={notFound.description}
    >
      <Button
        className="w-full touch-manipulation"
        render={<Link href={backHref} />}
        nativeButton={false}
      >
        {backLabel}
      </Button>
    </PortalCustomerShell>
  );
}
