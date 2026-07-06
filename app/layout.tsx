import type { Metadata } from "next";
import "./globals.css";
import { dmSans, fraunces } from "./fonts";
import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";

export const metadata: Metadata = {
  title: "Feedback Portal — Operator Sign In",
  description:
    "Sign in to create customer satisfaction surveys, share public links, and review responses.",
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
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body>
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/dashboard"
          emailOTP
        >
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
