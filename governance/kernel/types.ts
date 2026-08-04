import type { KernelBand } from "./bands.ts";
import { createIdGuard } from "./id-set.ts";

export const KERNEL_ADMISSION_STATES = Object.freeze([
	"ADMITTED",
	"PROVISIONAL",
	"PLANNED",
] as const);

export type KernelAdmissionState = (typeof KERNEL_ADMISSION_STATES)[number];
export const isKernelAdmissionState = createIdGuard(KERNEL_ADMISSION_STATES);

export const KERNEL_KINDS = Object.freeze(["CLOSED", "OPEN"] as const);
export type KernelKind = (typeof KERNEL_KINDS)[number];
export const isKernelKind = createIdGuard(KERNEL_KINDS);

export const KERNEL_PERSISTENCE_MODES = Object.freeze([
	"NONE",
	"INJECTED",
	"OWNED",
] as const);

export type KernelPersistenceMode = (typeof KERNEL_PERSISTENCE_MODES)[number];
export const isKernelPersistenceMode = createIdGuard(KERNEL_PERSISTENCE_MODES);

export const KERNEL_CRITICALITIES = Object.freeze(["C1", "C2", "C3"] as const);
export type KernelCriticality = (typeof KERNEL_CRITICALITIES)[number];
export const isKernelCriticality = createIdGuard(KERNEL_CRITICALITIES);

export const KERNEL_TOPOLOGY_PROFILES = Object.freeze([
	"foundation-leaf",
	"runtime-leaf",
	"runtime-configured",
	"data-plane",
	"control-plane",
] as const);

export type KernelTopologyProfile = (typeof KERNEL_TOPOLOGY_PROFILES)[number];
export const isKernelTopologyProfile = createIdGuard(KERNEL_TOPOLOGY_PROFILES);

export const KERNEL_SURFACES = Object.freeze([
	"root-capability",
	"tooling-only",
] as const);

export type KernelSurface = (typeof KERNEL_SURFACES)[number];
export const isKernelSurface = createIdGuard(KERNEL_SURFACES);

export interface KernelPackageRecord {
	readonly admissionState: KernelAdmissionState;
	readonly admittedCapability: string;
	readonly band: KernelBand;
	readonly contractReference: string;
	readonly criticality: KernelCriticality;
	readonly kind: KernelKind;
	readonly path: string;
	readonly persistence: KernelPersistenceMode;
	readonly surface: KernelSurface;
	readonly topologyProfile: KernelTopologyProfile;
}

export type KernelPackageRegistry = Readonly<
	Record<`@afenda/${string}`, KernelPackageRecord>
>;
