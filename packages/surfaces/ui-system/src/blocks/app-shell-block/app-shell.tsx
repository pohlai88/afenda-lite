"use client";

import { ChevronRightIcon } from "lucide-react";
import { type ComponentType, type ReactNode, useCallback } from "react";
import type { CommandMenuGroup } from "../../app-shell/command-menu";
import type { NotificationDropdownItem } from "../../app-shell/notification-dropdown";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuBadge,
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
	badge?: string;
	defaultOpen?: boolean;
	icon?: ComponentType<{ className?: string }>;
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
		brand?: { name: string; homeHref: string; subtitle?: string };
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
	commandMenu?: {
		groups: readonly CommandMenuGroup[];
		onCommand?: (id: string) => void;
	};
	notifications?: {
		emptyMessage?: string;
		notifications: readonly NotificationDropdownItem[];
		onDecision?: (id: string, decision: "accept" | "decline") => void;
	};
	profile?: {
		actions?: readonly { id: string; label: string }[];
		initials?: string;
		name: string;
		onAction?: (id: string) => void;
	};
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
	const Icon = item.icon;
	if (item.kind === "branch") {
		const active =
			item.items?.some((child) => isActive(currentPath, child)) ?? false;
		return (
			<Collapsible
				asChild
				className="group/collapsible"
				defaultOpen={active || item.defaultOpen === true}
				key={`${item.id}:${active}`}
			>
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton isActive={active} tooltip={item.label}>
							{Icon ? <Icon /> : null}
							<span>{item.label}</span>
							<ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<SidebarMenuSub>
							{item.items?.map((child) =>
								renderSubItem(child, currentPath, LinkComponent),
							)}
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
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
			<SidebarMenuButton asChild isActive={active} tooltip={item.label}>
				<LinkComponent
					href={item.href}
					{...(active ? { "aria-current": "page" } : {})}
					{...(external
						? { target: "_blank", rel: "noopener noreferrer" }
						: {})}
				>
					{Icon ? <Icon /> : null}
					<span>{item.label}</span>
				</LinkComponent>
			</SidebarMenuButton>
			{item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
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
					<span>{item.label}</span>
				</LinkComponent>
			</SidebarMenuSubButton>
			{item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
		</SidebarMenuSubItem>
	);
}

type AppShellInnerProps = AppShellProps & {
	resolvedDefaultSidebarOpen?: boolean;
};

function AppShellInner({
	brand,
	children,
	commandMenu,
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
	const brandName = brand ?? themeConfig?.brand?.name ?? "Afenda-Lite";
	const brandContent = (
		<>
			<div
				aria-hidden="true"
				className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground text-sm"
			>
				{brandName.slice(0, 1)}
			</div>
			<div className="min-w-0 group-data-[collapsible=icon]:hidden">
				<p className="truncate font-semibold text-sm">{brandName}</p>
				{themeConfig?.brand?.subtitle ? (
					<p className="truncate text-sidebar-muted-foreground text-xs">
						{themeConfig.brand.subtitle}
					</p>
				) : null}
			</div>
		</>
	);
	const handleSidebarOpenChange = useCallback(
		(sidebarOpen: boolean) => setSettings({ ...settings, sidebarOpen }),
		[setSettings, settings],
	);
	return (
		<SidebarProvider
			defaultOpen={resolvedDefaultSidebarOpen ?? settings.sidebarOpen}
			onOpenChange={handleSidebarOpenChange}
			open={settings.sidebarOpen}
		>
			<Sidebar
				collapsible={settings.sidebarCollapsible}
				variant={settings.sidebarVariant}
			>
				<SidebarHeader>
					{LinkComponent && themeConfig?.brand?.homeHref ? (
						<LinkComponent
							className="flex h-12 items-center gap-3 rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
							href={themeConfig.brand.homeHref}
						>
							{brandContent}
						</LinkComponent>
					) : (
						<div className="flex h-12 items-center gap-3 px-2">
							{brandContent}
						</div>
					)}
				</SidebarHeader>
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
				{footerText ? (
					<div className="truncate border-t p-3 text-sidebar-muted-foreground text-xs">
						{footerText}
					</div>
				) : null}
			</Sidebar>
			<SidebarInset className="bg-background">
				<AppShellHeader
					{...(commandMenu === undefined ? {} : { commandMenu })}
					header={shellHeader}
					{...(notifications === undefined ? {} : { notifications })}
					{...(profile === undefined ? {} : { profile })}
					unreadCount={unreadCount}
				/>
				<main
					className={cn(
						"bg-background",
						settings.layout === "compact" ? "p-4" : "p-6",
					)}
					data-slot="app-shell-content"
					id={mainContentId}
					tabIndex={mainContentId === undefined ? undefined : -1}
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
