"use client";

import type { ComponentType, ReactNode } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
} from "../../components/ui/sidebar";
import { cn } from "../../lib/utils";
import {
	type ApplicationShellSettings,
	DEFAULT_APPLICATION_SHELL_SETTINGS,
} from "./application-shell-settings";
import {
	AppShellThemeProvider,
	useApplicationShellSettings,
} from "./application-shell-settings-provider";
import { AppShellHeader, type AppShellHeaderConfig } from "./header";

type NavigationLinkComponent = ComponentType<{
	children: ReactNode;
	href: string;
	"aria-current"?: "page";
	target?: "_blank" | "_self";
	rel?: string;
	className?: string;
}>;

export type AppShellNavItem = Readonly<{
	kind: "link" | "branch" | string;
	id: string;
	label: string;
	href?: string;
	activePath?: string;
	items?: readonly AppShellNavItem[];
}>;

export type AppShellNavSection = Readonly<{
	id: string;
	label?: string;
	items: readonly AppShellNavItem[];
}>;

export type AppShellProps = Readonly<{
	children: ReactNode;
	header?: AppShellHeaderConfig;
	themeConfig?: {
		brand?: { name: string; homeHref: string };
		sidebar?: { groupLabelStyle?: "uppercase" | "default" };
	};
	navConfig?: {
		currentPath: string;
		linkComponent: NavigationLinkComponent;
		sections: readonly AppShellNavSection[];
	};
	defaultSettings?: ApplicationShellSettings;
	initialSettings?: ApplicationShellSettings;
	defaultSidebarOpen?: boolean;
	commandMenu?: { groups: readonly unknown[]; onCommand?: () => void };
	notifications?: {
		notifications: readonly { read?: boolean }[];
	};
	profile?: { name: string; initials?: string };
	showScrollToTop?: boolean;
	brand?: string;
	currentPath?: string;
	footerText?: string;
	mainContentId?: string;
	navigationLink?: NavigationLinkComponent;
	navigationItems?: readonly {
		id: string;
		label: string;
		href: string;
		kind?: string;
	}[];
}>;

function isActive(currentPath: string, item: AppShellNavItem): boolean {
	const target = item.activePath ?? item.href;
	if (target === undefined) {
		return false;
	}
	const [currentBase] = currentPath.split("?");
	const [targetBase] = target.split("?");
	return currentBase === targetBase || currentPath.startsWith(`${target}?`);
}

function renderItem(
	item: AppShellNavItem,
	currentPath: string,
	LinkComponent: NavigationLinkComponent,
) {
	if (item.kind === "branch") {
		const active = item.items?.some((child) => isActive(currentPath, child));
		return (
			<SidebarMenuItem key={item.id}>
				<button
					type="button"
					data-state={active ? "open" : "closed"}
					className="w-full rounded-md px-2 py-1.5 text-left text-sm"
				>
					{item.label}
				</button>
				{active ? (
					<SidebarMenuSub>
						{item.items?.map((child) =>
							renderSubItem(child, currentPath, LinkComponent),
						)}
					</SidebarMenuSub>
				) : null}
			</SidebarMenuItem>
		);
	}
	if (item.href === undefined) {
		return null;
	}
	const active = isActive(currentPath, item);
	const external =
		item.href.startsWith("http://") || item.href.startsWith("https://");
	return (
		<SidebarMenuItem key={item.id}>
			<SidebarMenuButton asChild isActive={active}>
				<LinkComponent
					href={item.href}
					{...(active ? { "aria-current": "page" } : {})}
					{...(external
						? { target: "_blank", rel: "noopener noreferrer" }
						: {})}
				>
					{item.label}
				</LinkComponent>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

function renderSubItem(
	item: AppShellNavItem,
	currentPath: string,
	LinkComponent: NavigationLinkComponent,
) {
	if (item.href === undefined) {
		return null;
	}

	const active = isActive(currentPath, item);
	const external =
		item.href.startsWith("http://") || item.href.startsWith("https://");

	return (
		<SidebarMenuSubItem key={item.id}>
			<SidebarMenuSubButton asChild isActive={active}>
				<LinkComponent
					href={item.href}
					{...(active ? { "aria-current": "page" } : {})}
					{...(external
						? { target: "_blank", rel: "noopener noreferrer" }
						: {})}
				>
					{item.label}
				</LinkComponent>
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
}

type AppShellInnerProps = AppShellProps & {
	resolvedDefaultSidebarOpen?: boolean;
};

function AppShellInner({
	brand,
	children,
	currentPath,
	resolvedDefaultSidebarOpen,
	footerText,
	header,
	mainContentId,
	navConfig,
	navigationItems,
	navigationLink,
	notifications,
	profile,
	themeConfig,
}: AppShellInnerProps) {
	const { setSettings, settings } = useApplicationShellSettings();
	const LinkComponent = navConfig?.linkComponent ?? navigationLink;
	const path = navConfig?.currentPath ?? currentPath ?? "/";
	const sections: readonly AppShellNavSection[] =
		navConfig?.sections ??
		(navigationItems === undefined
			? []
			: [
					{
						id: "workspace",
						items: navigationItems.map((item) => ({
							...item,
							kind: "link" as const,
						})),
					},
				]);
	const shellHeader = header ?? {
		title: themeConfig?.brand?.name ?? brand ?? "Afenda-Lite",
	};
	const unreadCount =
		notifications?.notifications.filter((notification) => !notification.read)
			.length ?? 0;
	return (
		<SidebarProvider
			defaultOpen={resolvedDefaultSidebarOpen ?? settings.sidebarOpen}
			open={settings.sidebarOpen}
			onOpenChange={(sidebarOpen) => setSettings({ ...settings, sidebarOpen })}
		>
			<Sidebar
				variant={settings.sidebarVariant}
				collapsible={settings.sidebarCollapsible}
			>
				<SidebarHeader>{brand ?? themeConfig?.brand?.name}</SidebarHeader>
				<SidebarContent>
					{sections.map((section) => (
						<SidebarGroup key={section.id}>
							{section.label ? (
								<SidebarGroupLabel
									className={cn(
										themeConfig?.sidebar?.groupLabelStyle === "uppercase" &&
											"uppercase tracking-wider",
									)}
								>
									{section.label}
								</SidebarGroupLabel>
							) : null}
							<SidebarGroupContent>
								<SidebarMenu>
									{LinkComponent === undefined
										? null
										: section.items.map((item) =>
												renderItem(item, path, LinkComponent),
											)}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					))}
				</SidebarContent>
				{footerText ? <div className="p-3 text-xs">{footerText}</div> : null}
			</Sidebar>
			<SidebarInset className="bg-background">
				<AppShellHeader
					header={shellHeader}
					{...(profile?.name === undefined
						? {}
						: { profileName: profile.name })}
					unreadCount={unreadCount}
				/>
				<main
					id={mainContentId}
					data-slot="app-shell-content"
					className={cn(
						"bg-background",
						settings.layout === "compact" ? "p-4" : "p-6",
					)}
				>
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

export function AppShell({
	defaultSettings = DEFAULT_APPLICATION_SHELL_SETTINGS,
	defaultSidebarOpen,
	initialSettings,
	...props
}: AppShellProps) {
	const settings = initialSettings ?? defaultSettings;

	return (
		<AppShellThemeProvider
			defaultSettings={defaultSettings}
			initialSettings={settings}
		>
			<AppShellInner
				{...props}
				defaultSettings={defaultSettings}
				initialSettings={settings}
				{...(defaultSidebarOpen === undefined
					? {}
					: { resolvedDefaultSidebarOpen: defaultSidebarOpen })}
			/>
		</AppShellThemeProvider>
	);
}
