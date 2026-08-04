import type { KernelEnforcementProfileId } from "./enforcement-profiles.ts";
import { createIdGuard } from "./id-set.ts";
import type { KernelPackageName } from "./package-registry.ts";

/**
 * Gate ids allowed on kernel enforcement declarations.
 * Each id must also exist in `scripts/lib/governance-gates.mjs` (`GOVERNANCE_GATES`);
 * `check:kernel-governance` rejects declarations that point at unregistered gates.
 */
export const KERNEL_ENFORCEMENT_GATE_IDS = Object.freeze([
	"errors-boundary",
	"errors-semantics",
] as const);

export type KernelEnforcementGateId =
	(typeof KERNEL_ENFORCEMENT_GATE_IDS)[number];

export const isKernelEnforcementGateId = createIdGuard(
	KERNEL_ENFORCEMENT_GATE_IDS,
);

export interface KernelEnforcementDeclaration {
	readonly governanceGates: readonly KernelEnforcementGateId[];
	readonly profiles: readonly KernelEnforcementProfileId[];
}

/**
 * Packages that declare enforcement contracts — a deliberate subset of
 * `KernelPackageName`, not the full registry. Add a row when a package is
 * ADMITTED (or otherwise needs declared gates/profiles); `Partial` is intentional
 * so packages without contracts remain absent rather than forcing empty stubs.
 */
export const KERNEL_ENFORCEMENT_CONTRACTS = Object.freeze({
	"@afenda/errors": Object.freeze({
		governanceGates: Object.freeze([
			"errors-boundary",
			"errors-semantics",
		] as const satisfies readonly KernelEnforcementGateId[]),
		profiles: Object.freeze([
			"root-capability",
			"nominal-mint",
			"runtime-opaque",
			"registry-authority",
			"projection-boundary",
		] as const satisfies readonly KernelEnforcementProfileId[]),
	}),
} satisfies Partial<Record<KernelPackageName, KernelEnforcementDeclaration>>);

/** Package names that currently declare an enforcement contract (not all kernel packages). */
export type KernelEnforcementContractName =
	keyof typeof KERNEL_ENFORCEMENT_CONTRACTS;
