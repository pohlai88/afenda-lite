import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { z } from "zod";

import { buildConsumerInventory } from "./consumer-inventory";

/**
 * Payroll adaptation of HR's mechanical architecture-debt scanner
 * (`packages/erp/human-resources/__tests__/helpers/architecture-debt.ts`),
 * plus three narrative categories for the real, documented debt called out
 * in `docs/erp/hr-payroll-bridging.md`:
 *  - `undrained-outbox-emission` (B6 — no dispatcher drains the outbox)
 *  - `dormant-workforce-port` (B1 — optional pull port wired nowhere in
 *    production)
 *  - `synthetic-statutory-calculator` (A2 — statutory calculators are
 *    synth-only, fail-closed)
 *  - `hr-termination-fact-gap` (D0 — the termination leave balance a final
 *    settlement encashes is caller-asserted, not a pinned HR fact)
 *  - `settlement-transition-audit-gap` (D4 — final-settlement status
 *    transitions persist without the audit + outbox CTE payroll runs use)
 * The mechanical categories are computed from the real source tree, same as
 * HR; HR's package-specific categories (`feature-composite-store`,
 * `adapter-composite-store`, `retired-path-reading-test`) reference HR-only
 * identifiers/retired paths and have no Payroll counterpart, so they are not
 * carried over verbatim — this fixture's category *keys* are Payroll's own,
 * per the task-5 brief ("HR's schema with payroll's real debt entries").
 */

export const architectureDebtCategoryKeys = [
	"directory-depth",
	"feature-to-composition",
	"feature-to-facade",
	"production-to-testing",
	"cross-feature-import",
	"feature-cycle",
	"consumer-deep-import",
	"undrained-outbox-emission",
	"dormant-workforce-port",
	"synthetic-statutory-calculator",
	"hr-termination-fact-gap",
	"settlement-transition-audit-gap",
] as const;

const categoryKeySchema = z.enum(architectureDebtCategoryKeys);
const debtItemSchema = z.object({
	evidence: z.string().min(1),
	file: z.string().min(1),
});
const categorySchema = z.object({
	items: z.array(debtItemSchema),
	key: categoryKeySchema,
	target: z.literal(0),
});
const reportSchema = z.object({
	categories: z
		.array(categorySchema)
		.length(architectureDebtCategoryKeys.length),
	packageName: z.literal("@afenda/payroll"),
	policy: z.object({
		baselineDisposition: z.literal("measured debt, never an allowlist"),
		maximumSourceSegments: z.literal(2),
		targetInvariant: z.literal("zero architecture debt in every category"),
	}),
	schemaVersion: z.literal(1),
	summary: z.object({
		featureCount: z.number().int().nonnegative(),
		sourceTypeScriptFiles: z.number().int().nonnegative(),
	}),
});

export type ArchitectureDebtCategoryKey = z.infer<typeof categoryKeySchema>;
export type ArchitectureDebtReport = z.infer<typeof reportSchema>;

interface ImportEdge {
	readonly file: string;
	readonly line: number;
	readonly sourceFeature?: string;
	readonly target: string;
	readonly targetFeature?: string;
}

interface MutableDebtItem {
	readonly evidence: string;
	readonly file: string;
}

function normalized(value: string): string {
	return value.replaceAll("\\", "/");
}

function walkTypeScript(directory: string): readonly string[] {
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const absolute = path.join(directory, entry.name);
			return entry.isDirectory() ? walkTypeScript(absolute) : [absolute];
		})
		.filter((file) => file.endsWith(".ts"))
		.toSorted();
}

function sourceRelative(sourceRoot: string, absolute: string): string {
	return `src/${normalized(path.relative(sourceRoot, absolute))}`;
}

function featureOf(file: string): string | undefined {
	const match = /^src\/features\/([^/]+)\//.exec(file);
	return match?.[1];
}

function resolveLocalImport(
	importer: string,
	specifier: string,
	knownFiles: ReadonlySet<string>,
): string | undefined {
	if (!specifier.startsWith(".")) {
		return;
	}
	const base = normalized(
		path.posix.normalize(
			path.posix.join(path.posix.dirname(importer), specifier),
		),
	);
	for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
		if (knownFiles.has(candidate)) {
			return candidate;
		}
	}
}

function importEdges(
	files: readonly string[],
	sourceRoot: string,
): readonly ImportEdge[] {
	const relativeFiles = files.map((file) => sourceRelative(sourceRoot, file));
	const knownFiles = new Set(relativeFiles);
	const edges: ImportEdge[] = [];

	for (const [index, absolute] of files.entries()) {
		const file = relativeFiles[index];
		if (file === undefined) {
			continue;
		}
		const source = ts.createSourceFile(
			file,
			readFileSync(absolute, "utf8"),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);
		for (const statement of source.statements) {
			if (
				!(
					ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
				)
			) {
				continue;
			}
			const { moduleSpecifier } = statement;
			if (
				moduleSpecifier === undefined ||
				!ts.isStringLiteral(moduleSpecifier)
			) {
				continue;
			}
			const target = resolveLocalImport(file, moduleSpecifier.text, knownFiles);
			if (target === undefined) {
				continue;
			}
			edges.push({
				file,
				line:
					source.getLineAndCharacterOfPosition(statement.getStart(source))
						.line + 1,
				sourceFeature: featureOf(file),
				target,
				targetFeature: featureOf(target),
			});
		}
	}
	return edges;
}

function edgeItem(edge: ImportEdge, relation: string): MutableDebtItem {
	return {
		evidence: `${edge.file}:${edge.line} -> ${edge.target} (${relation})`,
		file: edge.file,
	};
}

function sortedItems(items: readonly MutableDebtItem[]): MutableDebtItem[] {
	return [...items].toSorted((left, right) =>
		`${left.file}\0${left.evidence}`.localeCompare(
			`${right.file}\0${right.evidence}`,
		),
	);
}

function stronglyConnectedFeatureItems(
	edges: readonly ImportEdge[],
): readonly MutableDebtItem[] {
	const graph = new Map<string, Set<string>>();
	for (const edge of edges) {
		if (
			edge.sourceFeature !== undefined &&
			edge.targetFeature !== undefined &&
			edge.sourceFeature !== edge.targetFeature
		) {
			const targets = graph.get(edge.sourceFeature) ?? new Set<string>();
			targets.add(edge.targetFeature);
			graph.set(edge.sourceFeature, targets);
			if (!graph.has(edge.targetFeature)) {
				graph.set(edge.targetFeature, new Set());
			}
		}
	}

	let nextIndex = 0;
	const indexes = new Map<string, number>();
	const lowLinks = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const components: string[][] = [];

	const connect = (node: string): void => {
		indexes.set(node, nextIndex);
		lowLinks.set(node, nextIndex);
		nextIndex += 1;
		stack.push(node);
		onStack.add(node);

		for (const target of graph.get(node) ?? []) {
			if (!indexes.has(target)) {
				connect(target);
				lowLinks.set(
					node,
					Math.min(lowLinks.get(node) ?? 0, lowLinks.get(target) ?? 0),
				);
			} else if (onStack.has(target)) {
				lowLinks.set(
					node,
					Math.min(lowLinks.get(node) ?? 0, indexes.get(target) ?? 0),
				);
			}
		}

		if (lowLinks.get(node) !== indexes.get(node)) {
			return;
		}
		const component: string[] = [];
		let member: string | undefined;
		do {
			member = stack.pop();
			if (member !== undefined) {
				onStack.delete(member);
				component.push(member);
			}
		} while (member !== node);
		if (component.length > 1) {
			components.push(
				component.toSorted((left, right) => left.localeCompare(right)),
			);
		}
	};

	for (const feature of [...graph.keys()].toSorted()) {
		if (!indexes.has(feature)) {
			connect(feature);
		}
	}

	return components
		.toSorted((left, right) => left.join().localeCompare(right.join()))
		.map((component) => ({
			evidence: `strongly connected feature component: ${component.join(" <-> ")}`,
			file: `src/features/${component[0]}`,
		}));
}

function featureCycleItems(
	edges: readonly ImportEdge[],
): readonly MutableDebtItem[] {
	const directedPairs = new Set(
		edges.flatMap((edge) =>
			edge.sourceFeature !== undefined &&
			edge.targetFeature !== undefined &&
			edge.sourceFeature !== edge.targetFeature
				? [`${edge.sourceFeature}\0${edge.targetFeature}`]
				: [],
		),
	);
	const reciprocalPairs = [...directedPairs]
		.flatMap((pair) => {
			const [source, target] = pair.split("\0");
			if (
				source === undefined ||
				target === undefined ||
				source >= target ||
				!directedPairs.has(`${target}\0${source}`)
			) {
				return [];
			}
			return [[source, target] as const];
		})
		.toSorted((left, right) => left.join().localeCompare(right.join()));
	const nonReciprocalEdges = edges.filter((edge) => {
		if (edge.sourceFeature === undefined || edge.targetFeature === undefined) {
			return true;
		}
		return !directedPairs.has(`${edge.targetFeature}\0${edge.sourceFeature}`);
	});

	return [
		...reciprocalPairs.map(([source, target]) => ({
			evidence: `reciprocal feature cycle: ${source} <-> ${target}`,
			file: `src/features/${source}`,
		})),
		...stronglyConnectedFeatureItems(nonReciprocalEdges),
	];
}

/** Anchors a narrative debt item to the living line that still carries it. */
function anchoredNarrativeItem(input: {
	evidence: string;
	file: string;
	marker: string;
	packageRoot: string;
}): readonly MutableDebtItem[] {
	const content = readFileSync(
		path.join(input.packageRoot, input.file),
		"utf8",
	);
	const lineIndex = content
		.split("
")
		.findIndex((line) => line.includes(input.marker));
	if (lineIndex === -1) {
		return [];
	}
	return [
		{
			evidence: `${input.file}:${lineIndex + 1} ${input.evidence}`,
			file: input.file,
		},
	];
}

/** Real, reviewed narrative debt — see docs/erp/hr-payroll-bridging.md B1/A2/B6/D0/D4. */
function narrativeDebtItems(
	key:
		| "dormant-workforce-port"
		| "hr-termination-fact-gap"
		| "settlement-transition-audit-gap"
		| "synthetic-statutory-calculator"
		| "undrained-outbox-emission",
	packageRoot: string,
): readonly MutableDebtItem[] {
	if (key === "hr-termination-fact-gap") {
		return anchoredNarrativeItem({
			evidence:
				"accepts the termination leave balance as caller-asserted input; the closing balance is an HR fact that is not pinned into the settlement snapshot until D0 fact-widening lands (bridging doc D0/D4)",
			file: "src/features/final-settlement/settlement.schema.ts",
			marker: "leaveBalanceDays: payrollDecimalStringSchema,",
			packageRoot,
		});
	}
	if (key === "settlement-transition-audit-gap") {
		return anchoredNarrativeItem({
			evidence:
				"updates a final-settlement status transition without the audit + outbox CTE pattern payroll runs use (src/features/payroll-runs/runs.drizzle.ts is the target shape); closing it requires a settlement lifecycle event in @afenda/events plus dispatcher wiring, so it is measured debt rather than a contained change (bridging doc D4/B6)",
			file: "src/features/final-settlement/settlement.drizzle.ts",
			marker: "async saveFinalSettlementTransition(input) {",
			packageRoot,
		});
	}
	if (key === "dormant-workforce-port") {
		const file = "src/facade/contracts.ts";
		const content = readFileSync(path.join(packageRoot, file), "utf8");
		const lineIndex = content
			.split("\n")
			.findIndex((line) => line.includes("workforce?:"));
		if (lineIndex === -1) {
			return [];
		}
		return [
			{
				evidence: `${file}:${lineIndex + 1} declares an optional PayrollWorkforceCapability pull port that production wires nowhere (bridging doc B1: single push transport is live)`,
				file,
			},
		];
	}
	if (key === "synthetic-statutory-calculator") {
		const file = "src/features/statutory-rules/calculator-synth-v1.ts";
		const content = readFileSync(path.join(packageRoot, file), "utf8");
		const lineIndex = content
			.split("\n")
			.findIndex((line) =>
				line.includes('productionApproval: { status: "synthetic_only" }'),
			);
		if (lineIndex === -1) {
			return [];
		}
		return [
			{
				evidence: `${file}:${lineIndex + 1} registers the only statutory calculator as synthetic_only, fail-closed for production approval (bridging doc A2)`,
				file,
			},
		];
	}
	const file = "src/kernel/emissions/emission-registry.ts";
	const content = readFileSync(path.join(packageRoot, file), "utf8");
	const lineIndex = content
		.split("\n")
		.findIndex((line) => line.includes("dispatcher: null"));
	if (lineIndex === -1) {
		return [];
	}
	return [
		{
			evidence: `${file}:${lineIndex + 1} registers payroll lifecycle outbox emissions with dispatcher: null — no platform dispatcher drains the outbox (bridging doc B6)`,
			file,
		},
	];
}

export function buildArchitectureDebtReport(
	workspaceRoot: string,
	packageRoot: string,
): ArchitectureDebtReport {
	const sourceRoot = path.join(packageRoot, "src");
	const sourceFiles = walkTypeScript(sourceRoot);
	const featureFiles = sourceFiles.filter((file) =>
		normalized(path.relative(sourceRoot, file)).startsWith("features/"),
	);
	const edges = importEdges(sourceFiles, sourceRoot);
	const consumerInventory = buildConsumerInventory(workspaceRoot, packageRoot);

	const items: Record<ArchitectureDebtCategoryKey, MutableDebtItem[]> = {
		"consumer-deep-import": consumerInventory.references
			.filter((reference) => reference.entrypoint === "deep-internal")
			.map((reference) => ({
				evidence: `${reference.file} imports ${reference.symbol} from a deep Payroll entrypoint`,
				file: reference.file,
			})),
		"cross-feature-import": edges
			.filter(
				(edge) =>
					edge.sourceFeature !== undefined &&
					edge.targetFeature !== undefined &&
					edge.sourceFeature !== edge.targetFeature,
			)
			.map((edge) =>
				edgeItem(edge, `${edge.sourceFeature} -> ${edge.targetFeature}`),
			),
		"directory-depth": sourceFiles
			.map((file) => sourceRelative(sourceRoot, file))
			.filter((file) => file.split("/").length > 3)
			.map((file) => ({
				evidence: `${file} exceeds src/<owner>/<file>`,
				file,
			})),
		"dormant-workforce-port": [
			...narrativeDebtItems("dormant-workforce-port", packageRoot),
		],
		"feature-cycle": [...featureCycleItems(edges)],
		"hr-termination-fact-gap": [
			...narrativeDebtItems("hr-termination-fact-gap", packageRoot),
		],
		"feature-to-composition": edges
			.filter(
				(edge) =>
					edge.sourceFeature !== undefined &&
					edge.target.startsWith("src/composition/"),
			)
			.map((edge) => edgeItem(edge, "feature -> composition")),
		"feature-to-facade": edges
			.filter(
				(edge) =>
					edge.sourceFeature !== undefined &&
					edge.target.startsWith("src/facade/"),
			)
			.map((edge) => edgeItem(edge, "feature -> facade")),
		"production-to-testing": edges
			.filter(
				(edge) =>
					!edge.file.startsWith("src/testing/") &&
					edge.target.startsWith("src/testing/"),
			)
			.map((edge) => edgeItem(edge, "production -> testing")),
		"settlement-transition-audit-gap": [
			...narrativeDebtItems("settlement-transition-audit-gap", packageRoot),
		],
		"synthetic-statutory-calculator": [
			...narrativeDebtItems("synthetic-statutory-calculator", packageRoot),
		],
		"undrained-outbox-emission": [
			...narrativeDebtItems("undrained-outbox-emission", packageRoot),
		],
	};

	return reportSchema.parse({
		categories: architectureDebtCategoryKeys.map((key) => ({
			items: sortedItems(items[key]),
			key,
			target: 0,
		})),
		packageName: "@afenda/payroll",
		policy: {
			baselineDisposition: "measured debt, never an allowlist",
			maximumSourceSegments: 2,
			targetInvariant: "zero architecture debt in every category",
		},
		schemaVersion: 1,
		summary: {
			featureCount: new Set(
				featureFiles.map((file) => featureOf(sourceRelative(sourceRoot, file))),
			).size,
			sourceTypeScriptFiles: sourceFiles.length,
		},
	});
}

export function readArchitectureDebtFixture(
	file: string,
): ArchitectureDebtReport {
	return reportSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

export function architectureDebtRegressions(
	current: ArchitectureDebtReport,
	baseline: ArchitectureDebtReport,
): readonly string[] {
	const baselineByKey = new Map(
		baseline.categories.map((category) => [category.key, category]),
	);
	const regressions: string[] = [];
	for (const category of current.categories) {
		const previous = baselineByKey.get(category.key);
		if (previous === undefined) {
			regressions.push(`${category.key}: category has no reviewed baseline`);
			continue;
		}
		const previousEvidence = new Set(
			previous.items.map((item) => `${item.file}\0${item.evidence}`),
		);
		for (const item of category.items) {
			if (!previousEvidence.has(`${item.file}\0${item.evidence}`)) {
				regressions.push(`${category.key}: new debt: ${item.evidence}`);
			}
		}
		if (category.items.length > previous.items.length) {
			regressions.push(
				`${category.key}: count increased ${previous.items.length} -> ${category.items.length}`,
			);
		}
	}
	return regressions.toSorted((left, right) => left.localeCompare(right));
}
