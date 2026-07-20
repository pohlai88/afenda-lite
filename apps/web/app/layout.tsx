import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DevLoginFabHost } from "@/features/auth/dev-login-fab-host";
import { SkipToMainContent } from "@/features/auth/skip-to-main-content";

import "../globals.css";

export const metadata: Metadata = {
	title: {
		default: "Afenda-Lite",
		template: "%s · Afenda-Lite",
	},
	description: "Afenda-Lite — multi-module SaaS portal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			suppressHydrationWarning
		>
			<body>
				<SkipToMainContent />
				{children}
				<DevLoginFabHost />
			</body>
		</html>
	);
}
