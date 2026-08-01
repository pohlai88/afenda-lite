import type * as React from "react";
import { cn } from "../../lib/utils";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
} from "./page-header";

type WorkspacePageWidth = "standard" | "wide" | "full";
type WorkspacePageDensity = "comfortable" | "compact";

interface WorkspacePageProps
	extends Omit<React.ComponentProps<"section">, "className"> {
	density?: WorkspacePageDensity;
	width?: WorkspacePageWidth;
}

interface WorkspacePageHeaderProps
	extends Omit<
		React.ComponentProps<typeof PageHeader>,
		"children" | "className" | "title"
	> {
	actions?: React.ReactNode;
	description?: React.ReactNode;
	scope?: React.ReactNode;
	title: React.ReactNode;
}

interface WorkspacePageContentProps
	extends Omit<React.ComponentProps<"div">, "className"> {}

const widthClassNames = {
	standard: "max-w-5xl",
	wide: "max-w-6xl",
	full: "max-w-none",
} as const satisfies Record<WorkspacePageWidth, string>;

const densityClassNames = {
	comfortable: "gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10",
	compact: "gap-4 px-4 py-4 sm:px-6 sm:py-6",
} as const satisfies Record<WorkspacePageDensity, string>;

function WorkspacePage({
	width = "standard",
	density = "comfortable",
	...props
}: WorkspacePageProps) {
	return (
		<section
			{...props}
			className={cn(
				"mx-auto flex w-full min-w-0 flex-col",
				widthClassNames[width],
				densityClassNames[density],
			)}
			data-density={density}
			data-slot="workspace-page"
			data-width={width}
		/>
	);
}

function WorkspacePageHeader({
	title,
	description,
	scope,
	actions,
	...props
}: WorkspacePageHeaderProps) {
	return (
		<PageHeader {...props} data-slot="workspace-page-header">
			<div className="grid min-w-0 gap-1">
				{scope ? (
					<p className="text-muted-foreground text-sm">{scope}</p>
				) : null}
				<PageHeaderHeading>{title}</PageHeaderHeading>
				{description ? (
					<PageHeaderDescription>{description}</PageHeaderDescription>
				) : null}
			</div>
			{actions ? <PageHeaderActions>{actions}</PageHeaderActions> : null}
		</PageHeader>
	);
}

function WorkspacePageContent(props: WorkspacePageContentProps) {
	return (
		<div {...props} className="contents" data-slot="workspace-page-content" />
	);
}

export {
	WorkspacePage,
	WorkspacePageContent,
	type WorkspacePageContentProps,
	WorkspacePageHeader,
	type WorkspacePageHeaderProps,
	type WorkspacePageProps,
};
