"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import type { AppShellColorMode as ControlledColorMode } from "../blocks/app-shell-block/application-shell-settings";

export type { AppShellColorMode } from "../blocks/app-shell-block/application-shell-settings";

function ControlledThemeSync({
	controlledTheme,
}: Readonly<{ controlledTheme?: ControlledColorMode }>) {
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
	controlledTheme?: ControlledColorMode;
	defaultTheme?: ControlledColorMode;
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
			<ControlledThemeSync
				{...(controlledTheme === undefined ? {} : { controlledTheme })}
			/>
			{children}
		</ThemeProvider>
	);
}
