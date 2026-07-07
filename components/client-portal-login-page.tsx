import { ClientSignInForm } from "@/components/client-sign-in-form";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { portalCopy } from "@/lib/portal-copy";

export function ClientPortalLoginPage() {
  const { signIn, product } = portalCopy;

  return (
    <PortalAuthLayout
      eyebrow={product.portalEyebrow}
      heroTitle={signIn.heroTitle}
      heroDescription={signIn.heroDescription}
      signInTitle={signIn.title}
      signInDescription={signIn.description}
      trustNotice={portalCopy.trust.notices.clientLogin}
      footerHint={signIn.inviteHint}
      alternateLink={{ href: "/org/login", label: signIn.orgLink }}
      form={<ClientSignInForm />}
    />
  );
}
