"use client";

import type { AppShellProps as ApplicationShellProps } from "./app-shell";
import { AppShell as ApplicationShell } from "./app-shell";

export type { AppShellProps } from "./app-shell";

export function ApplicationShellBlock(props: ApplicationShellProps) {
	return <ApplicationShell {...props} />;
}

export { AppShell } from "./app-shell";
