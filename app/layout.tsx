import type { Metadata } from "next";
import "./globals.css";
import { inter } from "./fonts";
import { authClient } from "@/lib/auth/client";
import {
  NeonAuthUIProvider,
  UserButton,
} from "@neondatabase/neon-js/auth/react/ui";

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
    <html lang="en" className={`${inter.variable} dark`}>
      <NeonAuthUIProvider
        authClient={authClient}
        redirectTo="/account/settings"
        emailOTP
      >
        <header className="flex justify-end items-center p-4 gap-4 h-16">
          <UserButton size="icon" />
        </header>
        {children}
      </NeonAuthUIProvider>
    </html>
  );
}
