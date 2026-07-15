"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "../components/ui/sidebar";
import Footer from "./footer";
import Header from "./header";
import SidebarLayout from "./sidebar";

export function AdminShell({
	children,
	defaultSidebarOpen = true,
	showFooter = true,
	profileSlot,
	notificationSlot,
	activitySlot,
}: {
	children: ReactNode;
	defaultSidebarOpen?: boolean;
	showFooter?: boolean;
	/** Optional header profile control (playground lab fixtures). */
	profileSlot?: ReactNode;
	/** Optional header notifications control (playground lab fixtures). */
	notificationSlot?: ReactNode;
	/** Optional header activity control (playground lab fixtures). */
	activitySlot?: ReactNode;
}) {
	return (
		<SidebarProvider defaultOpen={defaultSidebarOpen}>
			<SidebarLayout />
			<SidebarInset>
				<Header
					profileSlot={profileSlot}
					notificationSlot={notificationSlot}
					activitySlot={activitySlot}
				/>
				<main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
				{showFooter ? <Footer /> : null}
			</SidebarInset>
		</SidebarProvider>
	);
}
