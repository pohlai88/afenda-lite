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
			className={cn("min-h-80 rounded-lg border", className)}
			orientation="horizontal"
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
			className={cn("min-w-56", className)}
			defaultSize="35%"
			minSize="20%"
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
				className={cn("min-w-0", className)}
				defaultSize="65%"
				minSize="35%"
				{...props}
			/>
		</>
	);
}

export { MasterDetail, MasterDetailPrimary, MasterDetailSecondary };
