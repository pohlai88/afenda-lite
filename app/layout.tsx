import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";

export const metadata: Metadata = {
  title: "Vercel + Neon",
  description: "Use Neon with Vercel and Neon Auth",
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
      className={`${inter.variable} dark`}
    >
      <body>
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/account/settings"
          emailOTP
        >
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
