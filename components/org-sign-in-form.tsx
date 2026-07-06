"use client";

import { adminSignInAction } from "@/app/actions/admin";
import { portalCopy } from "@/lib/portal-copy";
import { SignInForm } from "@/components/sign-in-form";

export function OrgSignInForm() {
  const { orgSignIn } = portalCopy;

  return (
    <SignInForm
      action={adminSignInAction}
      copy={{
        emailLabel: portalCopy.signIn.emailLabel,
        emailPlaceholder: portalCopy.signIn.emailPlaceholder,
        passwordLabel: portalCopy.signIn.passwordLabel,
        submit: portalCopy.signIn.submit,
        submitting: portalCopy.signIn.submitting,
      }}
      ariaLabelledBy="org-sign-in-heading"
    />
  );
}
