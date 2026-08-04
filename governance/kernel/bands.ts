import { createIdGuard } from "./id-set.ts";

export const KERNEL_BAND_IDS = Object.freeze([
	"foundation",
	"runtime",
	"data-plane",
	"control-plane",
] as const);

export type KernelBand = (typeof KERNEL_BAND_IDS)[number];

type KernelBandPathPrefix = {
	readonly [K in KernelBand]: `packages/${K}`;
};

/** Derived from `KERNEL_BAND_IDS` — keep 1:1 with band id until a band needs a nonstandard path. */
export const KERNEL_BAND_PATH_PREFIX: KernelBandPathPrefix = Object.freeze(
	Object.fromEntries(
		KERNEL_BAND_IDS.map((id) => [id, `packages/${id}`]),
	) as KernelBandPathPrefix,
);

export const isKernelBand = createIdGuard(KERNEL_BAND_IDS);
