import type { KernelBand } from "./bands.ts";
import type { KernelPackageName } from "./package-registry.ts";
import type {
	KernelAdmissionState,
	KernelCriticality,
	KernelKind,
	KernelPersistenceMode,
} from "./types.ts";

/**
 * Shared projection row for KERNEL-GOVERNANCE.md §3 and KERNEL-PRD-INDEX.md.
 * Shapes are intentionally identical — PRD index adds a leading ordinal in the
 * markdown table that is not part of the semantic row.
 */
export interface KernelGovernanceDocRow {
	readonly admissionState: KernelAdmissionState;
	readonly band: KernelBand;
	readonly criticality: KernelCriticality;
	readonly kind: KernelKind;
	readonly packageName: KernelPackageName;
	readonly persistence: KernelPersistenceMode;
	/** 1-based source line when parsed from a markdown table; absent on registry-derived rows. */
	readonly sourceLine?: number;
}

/** Intentional equivalence with {@link KernelGovernanceDocRow} until PRD index gains distinct fields. */
export type KernelPrdIndexRow = KernelGovernanceDocRow;
