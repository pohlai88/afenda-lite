"use client";

import { cva } from "class-variance-authority";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";

const trendVariants = cva(
	"inline-flex items-center gap-1 text-sm font-medium",
	{
		variants: {
			trend: {
				up: "text-success",
				down: "text-destructive",
				neutral: "text-muted-foreground",
			},
		},
		defaultVariants: {
			trend: "neutral",
		},
	},
);

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	value?: string | number;
	change?: string | number;
	trend?: "up" | "down" | "neutral";
	description?: string;
	loading?: boolean;
	icon?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
	(
		{
			className,
			title,
			value,
			change,
			trend = "neutral",
			description,
			loading = false,
			icon,
			...props
		},
		ref,
	) => {
		const getTrendIcon = () => {
			switch (trend) {
				case "up":
					return <TrendingUpIcon className="h-4 w-4" />;
				case "down":
					return <TrendingDownIcon className="h-4 w-4" />;
				default:
					return <MinusIcon className="h-4 w-4" />;
			}
		};

		return (
			<Card ref={ref} className={className} {...props}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
					{icon && (
						<div className="text-muted-foreground" aria-hidden="true">
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
							<div className="text-2xl font-bold">{value ?? "—"}</div>
							{(change !== undefined || description) && (
								<div className="flex items-center justify-between">
									{change !== undefined && (
										<div className={cn(trendVariants({ trend }))}>
											{getTrendIcon()}
											<span>
												{typeof change === "number" && change > 0 && "+"}
												{change}
												{typeof change === "number" && "%"}
											</span>
										</div>
									)}
									{description && (
										<p className="text-xs text-muted-foreground">
											{description}
										</p>
									)}
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		);
	},
);
MetricCard.displayName = "MetricCard";

interface MetricGridProps extends React.HTMLAttributes<HTMLDivElement> {
	metrics: Array<Omit<MetricCardProps, "className">>;
	columns?: 1 | 2 | 3 | 4;
}

const MetricGrid = React.forwardRef<HTMLDivElement, MetricGridProps>(
	({ className, metrics, columns = 3, ...props }, ref) => {
		const gridClass = {
			1: "grid-cols-1",
			2: "grid-cols-1 md:grid-cols-2",
			3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
			4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
		}[columns];

		return (
			<div
				ref={ref}
				className={cn(`grid gap-4 ${gridClass}`, className)}
				{...props}
			>
				{metrics.map((metric, index) => (
					<MetricCard key={index} {...metric} />
				))}
			</div>
		);
	},
);
MetricGrid.displayName = "MetricGrid";

export { MetricCard, MetricGrid, trendVariants };
