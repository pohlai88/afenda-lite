"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@afenda/ui-system";
import type { ReactNode } from "react";

export function CompanyTabs({
	overview,
	registration,
}: {
	overview: ReactNode;
	registration: ReactNode;
}) {
	return (
		<Tabs defaultValue="overview">
			<TabsList aria-label="Legal company details">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="registration">Registration</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">{overview}</TabsContent>
			<TabsContent value="registration">{registration}</TabsContent>
		</Tabs>
	);
}
