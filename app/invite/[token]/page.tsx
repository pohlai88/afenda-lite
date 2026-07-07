import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptInviteForm } from "@/components/accept-invite-form";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClientInvitationByToken } from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { clientInvite } = portalCopy;
  const invitation = await getClientInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  if (invitation.status !== "pending") {
    return (
      <PortalCustomerShell
        eyebrow={clientInvite.eyebrow}
        title={clientInvite.title}
        description={
          invitation.status === "expired"
            ? clientInvite.expired
            : clientInvite.alreadyAccepted
        }
        contentWidth="narrow"
      >
        <Button render={<Link href="/" />} nativeButton={false}>
          {portalCopy.signIn.title}
        </Button>
      </PortalCustomerShell>
    );
  }

  return (
    <PortalCustomerShell
      eyebrow={clientInvite.eyebrow}
      title={clientInvite.title}
      description={clientInvite.description}
      contentWidth="narrow"
    >
      <Card>
        <CardContent className="pt-6">
          <AcceptInviteForm
            token={token}
            fullName={invitation.fullName}
            email={invitation.email}
          />
        </CardContent>
      </Card>
    </PortalCustomerShell>
  );
}
