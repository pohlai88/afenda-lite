import type { Metadata } from "next";
import "./globals.css";
import { geistSans } from "./fonts";
import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — Sign in`,
  description: portalCopy.signIn.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={cn(geistSans.variable, "font-sans")}
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("client-declaration-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
        <ThemeProvider defaultTheme="system">
          <NeonAuthUIProvider
            authClient={authClient}
            redirectTo="/dashboard"
            emailOTP
          >
            {children}
          </NeonAuthUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
