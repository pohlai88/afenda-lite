"use client";

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
	documents: {
		label: "Documents",
		series: 1,
	},
} as const;

export interface ReceivablesStatusDatum {
	documents: number;
	status: string;
}

interface ReceivablesStatusChartProps {
	data: readonly ReceivablesStatusDatum[];
}

/** Presents feature-owned status counts; it does not calculate authoritative metrics. */
export function ReceivablesStatusChart({ data }: ReceivablesStatusChartProps) {
	if (data.length === 0) {
		return (
			<p className="text-foreground-secondary text-sm" role="status">
				No loaded documents are available for lifecycle distribution.
			</p>
		);
	}

	return (
		<section
			aria-labelledby="receivables-status-chart-title"
			className="grid min-w-0 gap-4"
		>
			<div className="grid gap-1">
				<h3 className="font-medium" id="receivables-status-chart-title">
					Loaded documents by lifecycle status
				</h3>
				<p className="text-foreground-secondary text-sm">
					Document count for the current loaded page (up to 50 records). This
					view is distribution evidence, not a measure of value or collection
					performance.
				</p>
			</div>

			<figure className="grid min-w-0 gap-2">
				<figcaption className="sr-only">
					Bar chart of loaded receivables document counts grouped by lifecycle
					status.
				</figcaption>
				<ChartContainer
					className="h-64 w-full"
					config={chartConfig}
					id="receivables-status-distribution"
				>
					<BarChart accessibilityLayer data={[...data]}>
						<CartesianGrid vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="status"
							tickLine={false}
							tickMargin={8}
						/>
						<YAxis
							allowDecimals={false}
							axisLine={false}
							tickLine={false}
							width={28}
						/>
						<ChartTooltip content={<ChartTooltipContent />} cursor={false} />
						<Bar dataKey="documents" fill="var(--color-documents)" radius={4} />
					</BarChart>
				</ChartContainer>
			</figure>

			<div className="overflow-x-auto">
				<Table aria-label="Exact receivables lifecycle distribution">
					<TableHeader>
						<TableRow>
							<TableHead scope="col">Lifecycle status</TableHead>
							<TableHead className="text-right" scope="col">
								Documents
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((datum) => (
							<TableRow key={datum.status}>
								<TableCell>{datum.status}</TableCell>
								<TableCell className="text-right font-mono tabular-nums">
									{datum.documents}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}
