"use client";

import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalInvitationJoinSteps } from "@/components/portal-invitation-join-steps";
import { portalCopy } from "@/lib/portal-copy";
import { ShieldCheckIcon } from "lucide-react";

export function PortalInvitationJoinBrandPanel({ activeStep }: { activeStep: number }) {
  const { clientInvitationJoin, product } = portalCopy;

  return (
    <>
      <div aria-hidden className="portal-auth-brand-spacer" />

      <div className="portal-invitation-hero-stack">
        <PortalEyebrow className="mb-4">{product.secureAccessEyebrow}</PortalEyebrow>
        <h1 className="portal-invitation-hero-title">{clientInvitationJoin.heroTitle}</h1>
        <p className="portal-invitation-hero-description">
          {clientInvitationJoin.heroDescription}
        </p>
      </div>

      <PortalInvitationJoinSteps activeStep={activeStep} variant="brand" />

      <div className="portal-auth-seal-line">
        <ShieldCheckIcon aria-hidden className="portal-auth-seal-icon" />
        <span>SECURE · CONFIDENTIAL · VERIFIED</span>
      </div>
    </>
  );
}
