"use client";

import type { AppShellProps } from "./app-shell";
import { AppShell } from "./app-shell";

export type { AppShellProps };

export function ApplicationShellBlock(props: AppShellProps) {
	return <AppShell {...props} />;
}

export { AppShell };
