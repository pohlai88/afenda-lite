"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";
import { useNeonAuthUiBaseUrl } from "@/lib/auth/neon-auth-ui-base-url";
import { neonAuthUiProviderDefaults } from "@/lib/auth/neon-auth-ui.config";

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const baseURL = useNeonAuthUiBaseUrl();
  const {
    basePath,
    redirectTo,
    account,
    changeEmail,
    credentials,
    signUp,
    organization,
    emailOTP,
    emailVerification,
    magicLink,
    social,
    localization,
    defaultTheme,
  } = neonAuthUiProviderDefaults;

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link}
      basePath={basePath}
      baseURL={baseURL}
      redirectTo={redirectTo}
      account={account}
      changeEmail={changeEmail}
      credentials={credentials}
      signUp={signUp}
      organization={organization}
      emailOTP={emailOTP}
      emailVerification={emailVerification}
      magicLink={magicLink}
      {...(social ? { social } : {})}
      localization={localization}
      defaultTheme={defaultTheme}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
