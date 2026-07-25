"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@afenda/ui-system";
import type { ReactNode } from "react";

export function CompanyTabs({
	overview,
	registration,
	governance,
	premises,
	capital,
	property,
	corporateAssets,
	intellectualProperty,
	insuranceCharges,
}: {
	overview: ReactNode;
	registration: ReactNode;
	governance: ReactNode;
	premises: ReactNode;
	capital: ReactNode;
	property: ReactNode;
	corporateAssets: ReactNode;
	intellectualProperty: ReactNode;
	insuranceCharges: ReactNode;
}) {
	return (
		<Tabs defaultValue="overview">
			<TabsList aria-label="Legal company details">
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="registration">Registration</TabsTrigger>
				<TabsTrigger value="governance">Governance</TabsTrigger>
				<TabsTrigger value="premises">Premises</TabsTrigger>
				<TabsTrigger value="capital">Capital</TabsTrigger>
				<TabsTrigger value="property">Property</TabsTrigger>
				<TabsTrigger value="corporate-assets">Corporate assets</TabsTrigger>
				<TabsTrigger value="intellectual-property">
					Intellectual property
				</TabsTrigger>
				<TabsTrigger value="insurance-charges">
					Insurance &amp; charges
				</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">{overview}</TabsContent>
			<TabsContent value="registration">{registration}</TabsContent>
			<TabsContent value="governance">{governance}</TabsContent>
			<TabsContent value="premises">{premises}</TabsContent>
			<TabsContent value="capital">{capital}</TabsContent>
			<TabsContent value="property">{property}</TabsContent>
			<TabsContent value="corporate-assets">{corporateAssets}</TabsContent>
			<TabsContent value="intellectual-property">
				{intellectualProperty}
			</TabsContent>
			<TabsContent value="insurance-charges">{insuranceCharges}</TabsContent>
		</Tabs>
	);
}
