"use client";

import { PortalSealLine } from "@/components/portal-atmosphere";
import { PortalEyebrow } from "@/components/portal/portal-eyebrow";
import { PortalInvitationJoinSteps } from "@/components/portal/portal-invitation-join-steps";
import { portalCopy } from "@/lib/copy/portal-copy";

export function PortalInvitationJoinBrandPanel({
  activeStep,
}: {
  activeStep: number;
}) {
  const { clientInvitationJoin, product } = portalCopy;

  return (
    <>
      <div className="portal-invitation-hero-stack">
        <PortalEyebrow className="mb-4">{product.secureAccessEyebrow}</PortalEyebrow>
        <h1 className="portal-invitation-hero-title">
          {clientInvitationJoin.heroTitle}
        </h1>
        <p className="portal-invitation-hero-description">
          {clientInvitationJoin.heroDescription}
        </p>
      </div>

      <PortalInvitationJoinSteps activeStep={activeStep} variant="brand" />

      <PortalSealLine showSeal />
    </>
  );
}
