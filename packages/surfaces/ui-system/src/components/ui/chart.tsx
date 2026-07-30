"use client";

import {
	type ComponentProps,
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
	useId,
} from "react";
import {
	type DefaultLegendContentProps,
	type DefaultTooltipContentProps,
	Legend,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { cn } from "../../lib/utils";

type ChartConfig = Record<
	string,
	{
		label?: ReactNode;
		icon?: ComponentType;
		color?: string;
		theme?: { light: string; dark: string };
	}
>;

const ChartContext = createContext<ChartConfig | null>(null);

function useChart() {
	const context = useContext(ChartContext);
	if (!context) {
		throw new Error("Chart components must be used within ChartContainer");
	}
	return context;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
	const entries = Object.entries(config).filter(
		([, item]) => item.color || item.theme,
	);
	if (entries.length === 0) {
		return null;
	}
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
}: ComponentProps<"div"> & {
	config: ChartConfig;
	children: ComponentProps<typeof ResponsiveContainer>["children"];
}) {
	const generatedId = useId();
	const chartId = `chart-${id ?? generatedId.replace(/:/g, "")}`;
	return (
		<ChartContext.Provider value={config}>
			<div
				className={cn(
					"flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-polar-grid]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
					className,
				)}
				data-chart={chartId}
				{...props}
			>
				<ChartStyle config={config} id={chartId} />
				<ResponsiveContainer>{children}</ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
}

const ChartTooltip = Tooltip;

function ChartTooltipContent({
	active,
	payload,
	label,
	labelFormatter,
	formatter,
	className,
}: DefaultTooltipContentProps & { active?: boolean; className?: string }) {
	const config = useChart();
	if (!(active && payload?.length)) {
		return null;
	}
	return (
		<div
			className={cn(
				"grid min-w-32 gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-popover-foreground text-xs shadow-(--shadow-overlay)",
				className,
			)}
		>
			{label === undefined ? null : (
				<div className="font-medium">
					{labelFormatter?.(label, payload) ?? label ?? null}
				</div>
			)}
			<div className="grid gap-1.5">
				{payload.map((item, index) => {
					const key = String(item.dataKey ?? item.name ?? index);
					const itemConfig = config[key];
					if (formatter) {
						return (
							<div key={key}>
								{formatter(item.value, item.name, item, index, payload)}
							</div>
						);
					}
					return (
						<div className="flex items-center justify-between gap-4" key={key}>
							<div className="flex items-center gap-2">
								<span
									aria-hidden="true"
									className="size-2.5 shrink-0 rounded-xs"
									style={{ backgroundColor: item.color }}
								/>
								<span className="text-muted-foreground">
									{itemConfig?.label ?? item.name}
								</span>
							</div>
							<span className="font-medium font-mono tabular-nums">
								{Array.isArray(item.value) ? item.value.join("–") : item.value}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

const ChartLegend = Legend;

function ChartLegendContent({
	payload,
	className,
}: DefaultLegendContentProps & { className?: string }) {
	const config = useChart();
	if (!payload?.length) {
		return null;
	}
	return (
		<div className={cn("flex items-center justify-center gap-4", className)}>
			{payload.map((item) => {
				const key = String(item.dataKey ?? item.value);
				return (
					<div className="flex items-center gap-1.5" key={key}>
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-xs"
							style={{ backgroundColor: item.color }}
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
