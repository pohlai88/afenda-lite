import Link from "next/link";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Button } from "@/components/ui/button";
import { portalCopy } from "@/lib/portal-copy";

export default function NotFound() {
  const { notFound, product } = portalCopy;

  return (
    <PortalCustomerShell
      eyebrow={product.portalEyebrow}
      title={notFound.title}
      description={notFound.description}
    >
      <Button
        className="w-full touch-manipulation"
        render={<Link href="/" />}
        nativeButton={false}
      >
        {notFound.backLabel}
      </Button>
    </PortalCustomerShell>
  );
}
