import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	type ChartConfig,
	ChartContainer,
	ChartStyle,
} from "../src/components/ui/chart";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const repositoryRoot = path.resolve(packageRoot, "../../..");

describe("Chart series semantic facade", () => {
	it("projects canonical data-series tokens through one theme-independent rule", () => {
		const config = {
			invoiced: { label: "Invoiced", series: 1 },
			paid: { label: "Paid", series: 2 },
		} as const satisfies ChartConfig;

		const html = renderToStaticMarkup(
			createElement(ChartStyle, { config, id: "chart-receivables" }),
		);

		expect(html).toContain("[data-chart=chart-receivables]");
		expect(html).toContain("--color-invoiced: var(--data-series-1);");
		expect(html).toContain("--color-paid: var(--data-series-2);");
		expect(html).not.toContain(".dark");
		expect(html.match(/\[data-chart=/g)).toHaveLength(1);
	});

	it("rejects unsafe series keys before interpolating CSS", () => {
		const config = {
			"paid] .injected": { label: "Paid", series: 2 },
		} as const satisfies ChartConfig;

		expect(() =>
			renderToStaticMarkup(
				createElement(ChartStyle, { config, id: "chart-receivables" }),
			),
		).toThrowError(
			"Chart series key must contain only CSS-safe identifier characters.",
		);
	});

	it("normalizes caller-provided chart ids before selector interpolation", () => {
		const config = {
			paid: { label: "Paid", series: 2 },
		} as const satisfies ChartConfig;
		const props: Parameters<typeof ChartContainer>[0] = {
			config,
			id: "receivables] .injected",
			children: createElement("svg"),
		};

		const html = renderToStaticMarkup(createElement(ChartContainer, props));

		expect(html).toContain('data-chart="chart-receivables-injected"');
		expect(html).toContain("w-full min-w-0");
		expect(html).toContain("[data-chart=chart-receivables-injected]");
		expect(html).not.toContain("] .injected");
	});

	it("keeps living chart consumers on semantic series slots", () => {
		const story = readFileSync(
			path.join(repositoryRoot, "apps/storybook/src/stories/chart.stories.tsx"),
			"utf8",
		);

		expect(story).toContain("series: 1");
		expect(story).toContain("series: 2");
		expect(story).not.toMatch(/var\(--chart-[1-5]\)/);
		expect(story).not.toMatch(/\bcolor:\s*"var\(--/);
		expect(story).not.toMatch(/\btheme:\s*\{/);
	});
});
