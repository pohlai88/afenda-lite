"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	Separator,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "@afenda/ui-system";
import { LayoutDashboard, Wheat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { ShellNavItem } from "@/features/portal-chrome/nav-config";

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
	"org-admin": LayoutDashboard,
	fft: Wheat,
};

type OperatorPlatformChromeProps = {
	navItems: ShellNavItem[];
	orgId: string;
	children: ReactNode;
};

/**
 * Client chrome for the shared operator ERP shell — Sidebar + sticky inset
 * header DNA from AFN-DNA-APPLICATION-SHELL-01 (locale/social/CDN stripped).
 */
export function OperatorPlatformChrome({
	navItems,
	orgId,
	children,
}: OperatorPlatformChromeProps) {
	const pathname = usePathname();
	const activeItem =
		navItems.find((item) => item.href === pathname) ??
		navItems.find((item) => pathname.startsWith(`${item.href}/`));

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader className="border-b border-sidebar-border">
					<div className="flex items-center gap-2 px-2 py-1">
						<span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
							Afenda-Lite
						</span>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Modules</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{navItems.map((item) => {
									const Icon = NAV_ICONS[item.id] ?? LayoutDashboard;
									const isActive =
										pathname === item.href ||
										pathname.startsWith(`${item.href}/`);
									return (
										<SidebarMenuItem key={item.id}>
											<SidebarMenuButton
												asChild
												isActive={isActive}
												tooltip={item.label}
											>
												<Link href={item.href}>
													<Icon aria-hidden />
													<span>{item.label}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarSeparator />
					<p className="truncate px-2 py-1 font-mono text-xs text-foreground-tertiary group-data-[collapsible=icon]:hidden">
						{orgId}
					</p>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<SidebarInset className="bg-canvas">
				<header className="sticky top-0 z-50 border-b border-border bg-surface-raised">
					<div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 sm:px-6">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="hidden h-4 sm:block"
						/>
						<Breadcrumb className="hidden sm:block">
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>
										{activeItem?.label ?? "Operator"}
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				<div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
