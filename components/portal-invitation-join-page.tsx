"use client";

import { NeonAuthPageShell } from "@/components/neon-auth-page-shell";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationNeonView } from "@/components/portal-invitation-neon-view";
import { portalCopy } from "@/lib/portal-copy";

export function PortalInvitationJoinPage() {
  const { clientInvitationJoin, organizationAuth, product } = portalCopy;

  return (
    <NeonAuthPageShell
      header={
        <PortalAuthEmailTrustNotice
          message={organizationAuth.trustNotice}
          variant="email"
        />
      }
    >
      <div className="flex w-full flex-col gap-6">
        <header className="space-y-1 text-center sm:text-left">
          <p className="text-micro font-medium uppercase tracking-wide text-primary">
            {product.secureAccessEyebrow}
          </p>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-balance">
            {clientInvitationJoin.panelCreateTitle}
          </h1>
          <p className="text-body text-muted-foreground text-pretty">
            {clientInvitationJoin.panelCreateDescription}
          </p>
        </header>

        <ol className="grid gap-2 text-caption text-muted-foreground sm:grid-cols-3">
          {clientInvitationJoin.steps.map((step, index) => (
            <li
              key={step.label}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <span className="font-medium text-foreground">
                {index + 1}. {step.label}
              </span>
              <p className="mt-1 text-pretty">{step.detail}</p>
            </li>
          ))}
        </ol>

        <PortalInvitationNeonView />
      </div>
    </NeonAuthPageShell>
  );
}
