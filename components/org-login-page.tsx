import { OrgSignInForm } from "@/components/org-sign-in-form";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { portalCopy } from "@/lib/portal-copy";

export function OrgLoginPage({ accessDenied = false }: { accessDenied?: boolean }) {
  const { orgSignIn, accessDenied: accessDeniedCopy, org } = portalCopy;

  return (
    <PortalAuthLayout
      eyebrow={org.eyebrow}
      heroTitle={orgSignIn.heroTitle}
      heroDescription={orgSignIn.heroDescription}
      signInTitle={orgSignIn.title}
      signInDescription={orgSignIn.description}
      trustNotice={portalCopy.trust.notices.orgLogin}
      alternateLink={{ href: "/", label: orgSignIn.clientLink }}
      signInHeadingId="org-sign-in-heading"
      headerExtra={
        accessDenied ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>{accessDeniedCopy.title}</AlertTitle>
            <AlertDescription>{orgSignIn.accessDenied}</AlertDescription>
          </Alert>
        ) : null
      }
      form={<OrgSignInForm />}
    />
  );
}
