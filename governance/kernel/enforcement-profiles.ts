import { createIdGuard } from "./id-set.ts";

export const KERNEL_ENFORCEMENT_PROFILE_IDS = Object.freeze([
	"root-capability",
	"nominal-mint",
	"runtime-opaque",
	"registry-authority",
	"scoped-capability",
	"projection-boundary",
] as const);

export type KernelEnforcementProfileId =
	(typeof KERNEL_ENFORCEMENT_PROFILE_IDS)[number];

export const isKernelEnforcementProfileId = createIdGuard(
	KERNEL_ENFORCEMENT_PROFILE_IDS,
);
