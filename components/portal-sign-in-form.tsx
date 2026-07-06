"use client";

import { adminSignInAction } from "@/app/actions/admin";
import { portalCopy } from "@/lib/portal-copy";
import { SignInForm } from "@/components/sign-in-form";

/** @deprecated Use OrgSignInForm at /org/login */
export function PortalSignInForm() {
  const { orgSignIn, signIn } = portalCopy;

  return (
    <SignInForm
      action={adminSignInAction}
      copy={{
        emailLabel: signIn.emailLabel,
        emailPlaceholder: signIn.emailPlaceholder,
        passwordLabel: signIn.passwordLabel,
        submit: signIn.submit,
        submitting: signIn.submitting,
      }}
      ariaLabelledBy="sign-in-heading"
    />
  );
}
