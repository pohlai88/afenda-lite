"use client";

import * as React from "react";
import type {
	DefaultLegendContentProps,
	DefaultTooltipContentProps,
} from "recharts";
import * as RechartsPrimitive from "recharts";
import { cn } from "../../lib/utils";

type ChartConfig = Record<
	string,
	{
		label?: React.ReactNode;
		icon?: React.ComponentType;
		color?: string;
		theme?: { light: string; dark: string };
	}
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
	const context = React.useContext(ChartContext);
	if (!context)
		throw new Error("Chart components must be used within ChartContainer");
	return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
	const entries = Object.entries(config).filter(
		([, item]) => item.color || item.theme,
	);
	if (entries.length === 0) return null;
	const rules = (["light", "dark"] as const)
		.map((theme) => {
			const selector =
				theme === "dark" ? `.dark [data-chart=${id}]` : `[data-chart=${id}]`;
			const variables = entries
				.map(
					([key, item]) =>
						`  --color-${key}: ${item.theme?.[theme] ?? item.color};`,
				)
				.join("\n");
			return `${selector} {\n${variables}\n}`;
		})
		.join("\n");
	return <style>{rules}</style>;
}

function ChartContainer({
	id,
	className,
	children,
	config,
	...props
}: React.ComponentProps<"div"> & {
	config: ChartConfig;
	children: React.ComponentProps<
		typeof RechartsPrimitive.ResponsiveContainer
	>["children"];
}) {
	const generatedId = React.useId();
	const chartId = `chart-${id ?? generatedId.replace(/:/g, "")}`;
	return (
		<ChartContext.Provider value={config}>
			<div
				data-chart={chartId}
				className={cn(
					"flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-polar-grid]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
					className,
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
	active,
	payload,
	label,
	labelFormatter,
	formatter,
	className,
}: DefaultTooltipContentProps & { active?: boolean; className?: string }) {
	const config = useChart();
	if (!active || !payload?.length) return null;
	return (
		<div
			className={cn(
				"grid min-w-32 gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-(--shadow-overlay)",
				className,
			)}
		>
			{label !== undefined ? (
				<div className="font-medium">
					{labelFormatter ? labelFormatter(label, payload) : label}
				</div>
			) : null}
			<div className="grid gap-1.5">
				{payload.map((item, index) => {
					const key = String(item.dataKey ?? item.name ?? index);
					const itemConfig = config[key];
					if (formatter)
						return (
							<div key={key}>
								{formatter(item.value, item.name, item, index, payload)}
							</div>
						);
					return (
						<div key={key} className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2">
								<span
									className="size-2.5 shrink-0 rounded-xs"
									style={{ backgroundColor: item.color }}
									aria-hidden="true"
								/>
								<span className="text-muted-foreground">
									{itemConfig?.label ?? item.name}
								</span>
							</div>
							<span className="font-mono font-medium tabular-nums">
								{Array.isArray(item.value) ? item.value.join("–") : item.value}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
	payload,
	className,
}: DefaultLegendContentProps & { className?: string }) {
	const config = useChart();
	if (!payload?.length) return null;
	return (
		<div className={cn("flex items-center justify-center gap-4", className)}>
			{payload.map((item) => {
				const key = String(item.dataKey ?? item.value);
				return (
					<div key={key} className="flex items-center gap-1.5">
						<span
							className="size-2 shrink-0 rounded-xs"
							style={{ backgroundColor: item.color }}
							aria-hidden="true"
						/>
						{config[key]?.label ?? item.value}
					</div>
				);
			})}
		</div>
	);
}

export {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent,
};
