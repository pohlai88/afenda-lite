"use client";

import {
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
 * Client chrome for the shared operator ERP shell — Sidebar from `@afenda/ui-system`.
 */
export function OperatorPlatformChrome({
	navItems,
	orgId,
	children,
}: OperatorPlatformChromeProps) {
	const pathname = usePathname();

	return (
		<SidebarProvider>
			<Sidebar collapsible="icon" variant="inset">
				<SidebarHeader className="border-b border-sidebar-border">
					<div className="flex items-center gap-2 px-2 py-1">
						<SidebarTrigger className="-ml-1" />
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
									return (
										<SidebarMenuItem key={item.id}>
											<SidebarMenuButton
												asChild
												isActive={pathname === item.href}
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
			<SidebarInset className="bg-canvas">{children}</SidebarInset>
		</SidebarProvider>
	);
}
