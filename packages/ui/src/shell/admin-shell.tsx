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
}: {
	children: ReactNode;
	defaultSidebarOpen?: boolean;
	showFooter?: boolean;
}) {
	return (
		<SidebarProvider defaultOpen={defaultSidebarOpen}>
			<SidebarLayout />
			<SidebarInset>
				<Header />
				<main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
				{showFooter ? <Footer /> : null}
			</SidebarInset>
		</SidebarProvider>
	);
}
