import type { MouseEventHandler, ReactElement, ReactNode } from "react";

import type { Settings } from "../contexts/settingsContext";

/**
 * Playground contracts.
 *
 * Each `*Contract` is the stable-minimum prop surface a gateway member
 * promises to accept. A component's own prop type may add fields a contract
 * doesn't mention (e.g. CVA-generated variant/size unions) — those stay
 * owned by the component and are never duplicated here. A contract must
 * not declare a field with a wider type than the component actually
 * implements; when in doubt, omit the field from the contract instead of
 * guessing its shape.
 */

export type ButtonContract = {
	children?: ReactNode;
	className?: string;
	disabled?: boolean;
	onClick?: MouseEventHandler<HTMLButtonElement>;
};

export type InputContract = {
	className?: string;
	disabled?: boolean;
	placeholder?: string;
	type?: string;
	id?: string;
	"aria-describedby"?: string;
};

export type AccordionContract = {
	children?: ReactNode;
	className?: string;
};

export type AccordionItemContract = {
	children?: ReactNode;
	className?: string;
	value: string;
};

export type AccordionTriggerContract = {
	children?: ReactNode;
	className?: string;
};

export type AccordionContentContract = {
	children?: ReactNode;
	className?: string;
};

export type ProfileDropdownContract = object;

export type NotificationDropdownContract = {
	trigger: ReactElement;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

export type ActivityDialogContract = {
	trigger: ReactElement;
	defaultOpen?: boolean;
	triggerClassName?: string;
};

export type ProvidersContract = {
	children: ReactNode;
	settingsCookie?: Settings;
	sidebarDefaultOpen?: boolean;
};

/**
 * Boundary metadata (not UI, not business logic) — the single source of
 * truth both `packages/design-system/__tests__/architecture.test.ts` and
 * `apps/web/__tests__/ui-boundary.test.ts` read, so the two tests can never
 * hand-drift from each other.
 */
export const ALLOWED_UI_SUBPATHS = [
	"@afenda/ui",
	"@afenda/ui/style.css",
	"@afenda/ui/playground",
	"@afenda/ui/playground/providers",
	"@afenda/ui/playground/types",
] as const;

/** `./playground` exports with no lab row — named, not guessed. */
export const PLAYGROUND_INFRA_EXPORTS = [
	"Accordion",
	"AccordionContent",
	"AccordionItem",
	"AccordionTrigger",
	"Button",
	"buttonVariants",
	"Input",
	"cn",
] as const;

/**
 * Proven composites on the barrel. Lab harness (`apps/web/features/playground`)
 * was removed 2026-07-15 — parity is this allowlist until a Studio MCP-driven
 * harness returns.
 */
export const PLAYGROUND_PROVEN_EXPORTS = [
	"ProfileDropdown",
	"NotificationDropdown",
	"ActivityDialog",
] as const;

/** `./playground/providers` exports — verified structurally, never by dynamic import (see providers.ts). */
export const PLAYGROUND_PROVIDERS_EXPORTS = ["Providers"] as const;
