import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Afenda-Lite",
    template: "%s · Afenda-Lite",
  },
  description: "Afenda-Lite — multi-module SaaS portal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
