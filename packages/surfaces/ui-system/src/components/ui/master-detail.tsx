"use client";

import type * as React from "react";
import { cn } from "../../lib/utils";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./resizable";

function MasterDetail({
	className,
	...props
}: React.ComponentProps<typeof ResizablePanelGroup>) {
	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className={cn("min-h-80 rounded-lg border", className)}
			{...props}
		/>
	);
}

function MasterDetailPrimary({
	className,
	...props
}: React.ComponentProps<typeof ResizablePanel>) {
	return (
		<ResizablePanel
			defaultSize="35%"
			minSize="20%"
			className={cn("min-w-56", className)}
			{...props}
		/>
	);
}

function MasterDetailSecondary({
	className,
	...props
}: React.ComponentProps<typeof ResizablePanel>) {
	return (
		<>
			<ResizableHandle withHandle />
			<ResizablePanel
				defaultSize="65%"
				minSize="35%"
				className={cn("min-w-0", className)}
				{...props}
			/>
		</>
	);
}

export { MasterDetail, MasterDetailPrimary, MasterDetailSecondary };
