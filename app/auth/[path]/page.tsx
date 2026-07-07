import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react/ui";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { portalCopy } from "@/lib/portal-copy";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

const authCopyByPath: Record<
  string,
  {
    signInTitle: string;
    signInDescription: string;
    alternateLink: { href: string; label: string };
    signInHeadingId?: string;
  }
> = {
  "sign-in": {
    signInTitle: portalCopy.signIn.title,
    signInDescription: portalCopy.signIn.description,
    alternateLink: { href: "/org/login", label: portalCopy.signIn.orgLink },
  },
  "sign-up": {
    signInTitle: "Create account",
    signInDescription: "Set up your portal access with the credentials provided by your administrator.",
    alternateLink: { href: "/auth/sign-in", label: "Back to sign in" },
  },
  "forgot-password": {
    signInTitle: "Reset password",
    signInDescription: "Enter your email and we will send reset instructions.",
    alternateLink: { href: "/auth/sign-in", label: "Back to sign in" },
  },
  "reset-password": {
    signInTitle: "Choose a new password",
    signInDescription: "Enter a new password for your account.",
    alternateLink: { href: "/auth/sign-in", label: "Back to sign in" },
  },
  "sign-out": {
    signInTitle: "Signing out",
    signInDescription: "Please wait while we end your session.",
    alternateLink: { href: "/auth/sign-in", label: "Sign in again" },
  },
};

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const copy = authCopyByPath[path] ?? authCopyByPath["sign-in"];
  const { signIn, product } = portalCopy;

  return (
    <PortalAuthLayout
      eyebrow={product.portalEyebrow}
      heroTitle={signIn.heroTitle}
      heroDescription={signIn.heroDescription}
      signInTitle={copy.signInTitle}
      signInDescription={copy.signInDescription}
      trustNotice={portalCopy.trust.notices.clientLogin}
      alternateLink={copy.alternateLink}
      signInHeadingId={copy.signInHeadingId}
      form={
        <div className="portal-neon-auth-view space-y-3">
          <AuthView pathname={path} />
          {path === "sign-in" ? (
            <p className="text-center text-sm">
              <Link href="/auth/forgot-password" className="portal-auth-alt-link">
                Forgot password?
              </Link>
            </p>
          ) : null}
        </div>
      }
      footerHint={path === "sign-in" ? signIn.inviteHint : undefined}
    />
  );
}
