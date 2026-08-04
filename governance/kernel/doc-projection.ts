import { isKernelBand } from "./bands.ts";
import { compareAsciiOrdinal } from "./compare.ts";
import type { KernelGovernanceDocRow, KernelPrdIndexRow } from "./doc-rows.ts";
import { KERNEL_PACKAGES, type KernelPackageName } from "./package-registry.ts";
import {
	isKernelAdmissionState,
	isKernelCriticality,
	isKernelKind,
	isKernelPersistenceMode,
} from "./types.ts";

const GOVERNANCE_TABLE_ROW_PATTERN =
	/^\|\s*`(@afenda\/[^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`?(C[123])`?\s*\|\s*`([^`]+)`\s*\|/u;

const PRD_INDEX_TABLE_ROW_PATTERN =
	/^\|\s*\d+\s*\|\s*`(@afenda\/[^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`?(C[123])`?\s*\|\s*`([^`]+)`\s*\|/u;

const LINE_SPLIT_PATTERN = /\r?\n/u;
const TABLE_SEPARATOR_PATTERN = /^\|[\s\-:|]+\|$/u;
/** First data cell is a kernel package — near-misses of *this* table, not every `@afenda/` mention. */
const LOOKS_LIKE_GOVERNANCE_PACKAGE_ROW_PATTERN = /^\|\s*`@afenda\//u;
const LOOKS_LIKE_PRD_PACKAGE_ROW_PATTERN = /^\|\s*\d+\s*\|\s*`@afenda\//u;

export class KernelDocProjectionError extends Error {
	readonly rejectedLines: readonly string[];

	constructor(message: string, rejectedLines: readonly string[] = []) {
		super(message);
		this.name = "KernelDocProjectionError";
		this.rejectedLines = Object.freeze([...rejectedLines]);
	}
}

const isKernelPackageName = (value: string): value is KernelPackageName =>
	Object.hasOwn(KERNEL_PACKAGES, value);

interface ParsedFieldBag {
	readonly admissionState: string;
	readonly band: string;
	readonly criticality: string;
	readonly kind: string;
	readonly packageName: string;
	readonly persistence: string;
}

const validateRowFields = (
	fields: ParsedFieldBag,
	sourceLine: number,
): KernelGovernanceDocRow | string => {
	if (!isKernelPackageName(fields.packageName)) {
		return `line ${sourceLine}: unknown kernel package ${fields.packageName}`;
	}
	if (!isKernelBand(fields.band)) {
		return `line ${sourceLine}: unknown band ${fields.band}`;
	}
	if (!isKernelKind(fields.kind)) {
		return `line ${sourceLine}: unknown kind ${fields.kind}`;
	}
	if (!isKernelPersistenceMode(fields.persistence)) {
		return `line ${sourceLine}: unknown persistence ${fields.persistence}`;
	}
	if (!isKernelCriticality(fields.criticality)) {
		return `line ${sourceLine}: unknown criticality ${fields.criticality}`;
	}
	if (!isKernelAdmissionState(fields.admissionState)) {
		return `line ${sourceLine}: unknown admissionState ${fields.admissionState}`;
	}
	return Object.freeze({
		packageName: fields.packageName,
		band: fields.band,
		kind: fields.kind,
		persistence: fields.persistence,
		criticality: fields.criticality,
		admissionState: fields.admissionState,
		sourceLine,
	});
};

const parseTableRows = (
	contents: string,
	pattern: RegExp,
	surface: string,
	nearMissPattern: RegExp,
): readonly KernelGovernanceDocRow[] => {
	const lines = contents.split(LINE_SPLIT_PATTERN);
	const rows: KernelGovernanceDocRow[] = [];
	const rejected: string[] = [];
	const seen = new Map<KernelPackageName, number>();

	for (const [index, line] of lines.entries()) {
		const sourceLine = index + 1;
		const trimmed = line.trim();
		if (trimmed.length === 0 || TABLE_SEPARATOR_PATTERN.test(trimmed)) {
			continue;
		}

		const match = trimmed.match(pattern);
		if (!match) {
			if (nearMissPattern.test(trimmed)) {
				rejected.push(
					`line ${sourceLine}: package-table row did not match ${surface} pattern`,
				);
			}
			continue;
		}

		const [
			,
			packageName,
			band,
			kind,
			persistence,
			criticality,
			admissionState,
		] = match;
		if (
			packageName === undefined ||
			band === undefined ||
			kind === undefined ||
			persistence === undefined ||
			criticality === undefined ||
			admissionState === undefined
		) {
			rejected.push(`line ${sourceLine}: incomplete ${surface} capture groups`);
			continue;
		}

		const validated = validateRowFields(
			{
				packageName,
				band,
				kind,
				persistence,
				criticality,
				admissionState,
			},
			sourceLine,
		);
		if (typeof validated === "string") {
			rejected.push(validated);
			continue;
		}

		const priorLine = seen.get(validated.packageName);
		if (priorLine !== undefined) {
			rejected.push(
				`line ${sourceLine}: duplicate package ${validated.packageName} (first at line ${priorLine})`,
			);
			continue;
		}
		seen.set(validated.packageName, sourceLine);
		rows.push(validated);
	}

	if (rejected.length > 0) {
		throw new KernelDocProjectionError(
			`${surface} projection failed with ${rejected.length} rejected line(s):\n${rejected.join("\n")}`,
			rejected,
		);
	}

	return Object.freeze(
		[...rows].sort((left, right) =>
			compareAsciiOrdinal(left.packageName, right.packageName),
		),
	);
};

export const parseKernelGovernanceDocRows = (
	contents: string,
): readonly KernelGovernanceDocRow[] =>
	parseTableRows(
		contents,
		GOVERNANCE_TABLE_ROW_PATTERN,
		"KERNEL-GOVERNANCE",
		LOOKS_LIKE_GOVERNANCE_PACKAGE_ROW_PATTERN,
	);

export const parseKernelPrdIndexRows = (
	contents: string,
): readonly KernelPrdIndexRow[] =>
	parseTableRows(
		contents,
		PRD_INDEX_TABLE_ROW_PATTERN,
		"KERNEL-PRD-INDEX",
		LOOKS_LIKE_PRD_PACKAGE_ROW_PATTERN,
	);
