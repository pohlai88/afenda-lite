"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import type { AppShellColorMode } from "../blocks/app-shell-block/application-shell-settings";

export type { AppShellColorMode };

function ControlledThemeSync({
	controlledTheme,
}: Readonly<{ controlledTheme?: AppShellColorMode }>) {
	const { setTheme } = useTheme();

	useEffect(() => {
		if (controlledTheme !== undefined) {
			setTheme(controlledTheme);
		}
	}, [controlledTheme, setTheme]);

	return null;
}

export function AppShellThemeProvider({
	attribute = "class",
	children,
	controlledTheme,
	defaultTheme = controlledTheme ?? "system",
	disableTransitionOnChange = true,
	enableSystem = true,
}: Readonly<{
	attribute?: "class" | `data-${string}`;
	children: ReactNode;
	controlledTheme?: AppShellColorMode;
	defaultTheme?: AppShellColorMode;
	disableTransitionOnChange?: boolean;
	enableSystem?: boolean;
}>) {
	return (
		<ThemeProvider
			attribute={attribute}
			defaultTheme={defaultTheme}
			disableTransitionOnChange={disableTransitionOnChange}
			enableColorScheme
			enableSystem={enableSystem}
			storageKey="theme"
		>
			<ControlledThemeSync controlledTheme={controlledTheme} />
			{children}
		</ThemeProvider>
	);
}
