import { ClientSignInForm } from "@/components/client-sign-in-form";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { portalCopy } from "@/lib/portal-copy";

function resolveLoginHint(reason?: string) {
  if (reason === "check-email") {
    return portalCopy.signIn.checkEmailHint;
  }
  if (reason === "login-required") {
    return portalCopy.signIn.loginRequiredHint;
  }
  return portalCopy.signIn.inviteHint;
}

export function ClientPortalLoginPage({ reason }: { reason?: string }) {
  const { signIn, product } = portalCopy;

  return (
    <PortalAuthLayout
      eyebrow={product.portalEyebrow}
      heroTitle={signIn.heroTitle}
      heroDescription={signIn.heroDescription}
      signInTitle={signIn.title}
      signInDescription={signIn.description}
      trustNotice={portalCopy.trust.notices.clientLogin}
      footerHint={resolveLoginHint(reason)}
      alternateLink={{ href: "/org/login", label: signIn.orgLink }}
      form={<ClientSignInForm />}
    />
  );
}
