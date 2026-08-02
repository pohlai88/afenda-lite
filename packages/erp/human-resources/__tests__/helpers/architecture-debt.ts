import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { z } from "zod";

import { buildConsumerInventory } from "./consumer-inventory.ts";

export const architectureDebtCategoryKeys = [
	"directory-depth",
	"feature-to-composition",
	"feature-to-facade",
	"production-to-testing",
	"feature-composite-store",
	"cross-feature-import",
	"feature-cycle",
	"adapter-composite-store",
	"consumer-deep-import",
	"retired-path-reading-test",
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
	packageName: z.literal("@afenda/human-resources"),
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

const retiredSourceRootPattern =
	/packages\/erp\/human-resources\/src\/(?:adapters|bulk|bulk-export|bulk-jobs|compensation-benefits|compliance|core|emissions|employee-relations|employment-lifecycle|handoff|hire-orchestration|integrations|learning|leave|lifecycle|observability|organization|performance|performance-verification|privacy|recovery-verification|recruitment|reliability|reporting|schemas|shared|store|talent|time|workforce-foundation|workforce-planning)(?:\/|$)/;

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

function identifierFiles(
	files: readonly string[],
	sourceRoot: string,
	identifier: string,
): readonly MutableDebtItem[] {
	const findings: MutableDebtItem[] = [];
	for (const absolute of files) {
		const file = sourceRelative(sourceRoot, absolute);
		const source = ts.createSourceFile(
			file,
			readFileSync(absolute, "utf8"),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);
		let firstLine: number | undefined;
		const visit = (node: ts.Node): void => {
			if (
				firstLine === undefined &&
				ts.isIdentifier(node) &&
				(node.text === identifier || node.text === `Memory${identifier}`)
			) {
				firstLine =
					source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
		if (firstLine !== undefined) {
			findings.push({
				evidence: `${file}:${firstLine} names ${identifier}`,
				file,
			});
		}
	}
	return findings;
}

function adapterCompositeStoreItems(
	featureFiles: readonly string[],
	sourceRoot: string,
): readonly MutableDebtItem[] {
	return identifierFiles(
		featureFiles.filter((file) => normalized(file).includes("/adapters/")),
		sourceRoot,
		"HumanResourcesStore",
	).map((item) => ({
		...item,
		evidence: `${item.evidence} beneath a feature adapter`,
	}));
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
		"adapter-composite-store": [
			...adapterCompositeStoreItems(featureFiles, sourceRoot),
		],
		"consumer-deep-import": consumerInventory.references
			.filter((reference) => reference.entrypoint === "deep-internal")
			.map((reference) => ({
				evidence: `${reference.file} imports ${reference.symbol} from a deep HR entrypoint`,
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
		"feature-composite-store": [
			...identifierFiles(featureFiles, sourceRoot, "HumanResourcesStore"),
		],
		"feature-cycle": [...featureCycleItems(edges)],
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
		"retired-path-reading-test": consumerInventory.references
			.filter(
				(reference) =>
					reference.consumerClass === "testing" &&
					reference.referenceKind === "filesystem" &&
					retiredSourceRootPattern.test(normalized(reference.symbol)),
			)
			.map((reference) => ({
				evidence: `${reference.file} reads retired path ${normalized(reference.symbol)}`,
				file: reference.file,
			})),
	};

	return reportSchema.parse({
		categories: architectureDebtCategoryKeys.map((key) => ({
			items: sortedItems(items[key]),
			key,
			target: 0,
		})),
		packageName: "@afenda/human-resources",
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
