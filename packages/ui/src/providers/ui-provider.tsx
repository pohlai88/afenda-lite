"use client";

import type { ReactNode } from "react";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import type { Settings } from "../stores/settings";
import { FeedbackProvider } from "./feedback-provider";
import { SettingsProvider } from "./settings-provider";
import { ThemeProvider } from "./theme-provider";

export function UiProvider({
	children,
	settings,
}: {
	children: ReactNode;
	settings?: Partial<Settings>;
}) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={settings?.mode ?? "system"}
			enableSystem
			disableTransitionOnChange
		>
			<SettingsProvider initialSettings={settings}>
				<TooltipProvider>
					<FeedbackProvider>
						{children}
						<Toaster />
					</FeedbackProvider>
				</TooltipProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
}
