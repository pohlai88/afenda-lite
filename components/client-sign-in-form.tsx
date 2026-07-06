"use client";

import { clientSignInAction } from "@/app/actions/client";
import { portalCopy } from "@/lib/portal-copy";
import { SignInForm } from "@/components/sign-in-form";

export function ClientSignInForm() {
  const { signIn } = portalCopy;

  return (
    <SignInForm
      action={clientSignInAction}
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
