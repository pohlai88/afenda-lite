"use client";

import { cva } from "class-variance-authority";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";

const trendVariants = cva("inline-flex items-center gap-1 font-bold text-sm", {
	variants: {
		trend: {
			up: "text-success-subtle-foreground",
			down: "text-destructive-subtle-foreground",
			neutral: "text-muted-foreground",
		},
	},
	defaultVariants: {
		trend: "neutral",
	},
});

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
	change?: string | number;
	description?: string;
	icon?: ReactNode;
	loading?: boolean;
	title: string;
	trend?: "up" | "down" | "neutral";
	value?: string | number;
}

const TREND_ICONS = {
	down: <TrendingDownIcon className="h-4 w-4" />,
	neutral: <MinusIcon className="h-4 w-4" />,
	up: <TrendingUpIcon className="h-4 w-4" />,
} as const;

const MetricCard = ({
	className,
	title,
	value,
	change,
	trend = "neutral",
	description,
	loading = false,
	icon,
	ref,
	...props
}: MetricCardProps & { ref?: RefObject<HTMLDivElement | null> }) => (
	<Card className={className} ref={ref} {...props}>
		<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle className="font-medium text-muted-foreground text-sm">
				{title}
			</CardTitle>
			{icon === null || icon === undefined ? null : (
				<div aria-hidden="true" className="text-muted-foreground">
					{icon}
				</div>
			)}
		</CardHeader>
		<CardContent>
			{loading ? (
				<div className="space-y-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-4 w-16" />
				</div>
			) : (
				<>
					<div className="font-bold text-2xl">{value ?? "—"}</div>
					{(change !== undefined || description) && (
						<div className="flex items-center justify-between">
							{change !== undefined && (
								<div className={cn(trendVariants({ trend }))}>
									{TREND_ICONS[trend]}
									<span>
										{typeof change === "number" && change > 0 && "+"}
										{change}
										{typeof change === "number" && "%"}
									</span>
								</div>
							)}
							{description === null || description === undefined ? null : (
								<p className="text-muted-foreground text-xs">{description}</p>
							)}
						</div>
					)}
				</>
			)}
		</CardContent>
	</Card>
);
MetricCard.displayName = "MetricCard";

interface MetricGridProps extends HTMLAttributes<HTMLDivElement> {
	columns?: 1 | 2 | 3 | 4;
	metrics: Omit<MetricCardProps, "className">[];
}

const MetricGrid = ({
	className,
	metrics,
	columns = 3,
	ref,
	...props
}: MetricGridProps & { ref?: RefObject<HTMLDivElement | null> }) => {
	const gridClass = {
		1: "grid-cols-1",
		2: "grid-cols-1 md:grid-cols-2",
		3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
		4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
	}[columns];

	return (
		<div
			className={cn(`grid gap-4 ${gridClass}`, className)}
			ref={ref}
			{...props}
		>
			{metrics.map((metric, index) => (
				<MetricCard key={index} {...metric} />
			))}
		</div>
	);
};
MetricGrid.displayName = "MetricGrid";

export { MetricCard, MetricGrid, trendVariants };
