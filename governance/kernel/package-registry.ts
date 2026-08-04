import { KERNEL_BAND_PATH_PREFIX, type KernelBand } from "./bands.ts";
import { compareAsciiOrdinal } from "./compare.ts";
import type {
	KernelPackageRecord,
	KernelPackageRegistry,
	KernelSurface,
	KernelTopologyProfile,
} from "./types.ts";

const kernelReference = (slug: string): string =>
	`.cursor/skills/afenda-elite-kernel/references/${slug}-kernel.md`;

type DefineKernelPackageInput = Omit<KernelPackageRecord, "path"> & {
	readonly leaf: string;
};

/**
 * Derive `path` from `band` + `leaf` so band/path cannot drift independently.
 * KRN-GOV-003 remains a belt-and-suspenders check in the validator.
 */
const defineKernelPackage = (
	input: DefineKernelPackageInput,
): KernelPackageRecord => {
	const { leaf, ...record } = input;
	return Object.freeze({
		...record,
		path: `${KERNEL_BAND_PATH_PREFIX[record.band]}/${leaf}`,
	});
};

export const KERNEL_PACKAGES = Object.freeze({
	"@afenda/config": defineKernelPackage({
		admittedCapability:
			"Shared TypeScript, Biome, and Vitest configuration profiles for the monorepo",
		admissionState: "PROVISIONAL",
		band: "foundation",
		leaf: "config",
		contractReference: kernelReference("config"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "tooling-only",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/errors": defineKernelPackage({
		admittedCapability:
			"Canonical outcome representation, code space, retry semantics, and normalization of unknown or vendor failures",
		admissionState: "ADMITTED",
		band: "foundation",
		leaf: "errors",
		contractReference: kernelReference("errors"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/env": defineKernelPackage({
		admittedCapability:
			"Configuration schema, parse, validation, and runtime-isolated environment loading",
		admissionState: "PROVISIONAL",
		band: "foundation",
		leaf: "env",
		contractReference: kernelReference("env"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/testing": defineKernelPackage({
		admittedCapability:
			"Shared test harness, lane definitions, and Vitest control-plane contracts",
		admissionState: "PROVISIONAL",
		band: "foundation",
		leaf: "testing",
		contractReference: kernelReference("testing"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/ids": defineKernelPackage({
		admittedCapability:
			"Branded identifier contracts, parsing, validation, and controlled ULID/UUIDv7 generation",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "ids",
		contractReference: kernelReference("ids"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/money": defineKernelPackage({
		admittedCapability:
			"Minor-unit monetary representation, arithmetic, allocation, and explicit rounding",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "money",
		contractReference: kernelReference("money"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/quantity": defineKernelPackage({
		admittedCapability:
			"Dimension taxonomy, unit definition, and dimensional conversion",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "quantity",
		contractReference: kernelReference("quantity"),
		criticality: "C1",
		kind: "OPEN",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/temporal": defineKernelPackage({
		admittedCapability:
			"Instant, business date, effective range, and period arithmetic",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "temporal",
		contractReference: kernelReference("temporal"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/codes": defineKernelPackage({
		admittedCapability:
			"Canonical externally governed reference codes and their validation or lookup projections",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "codes",
		contractReference: kernelReference("codes"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/tenancy": defineKernelPackage({
		admittedCapability:
			"Execution-context representation for organization, actor, and correlation identity",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "tenancy",
		contractReference: kernelReference("tenancy"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/authz": defineKernelPackage({
		admittedCapability:
			"Permission grammar, decision representation, and universal evaluation primitives",
		admissionState: "PLANNED",
		band: "foundation",
		leaf: "authz",
		contractReference: kernelReference("authz"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "foundation-leaf",
	}),
	"@afenda/logger": defineKernelPackage({
		admittedCapability:
			"Structured logging emission, context propagation, and canonical redaction",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "logger",
		contractReference: kernelReference("logger"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-leaf",
	}),
	"@afenda/http": defineKernelPackage({
		admittedCapability:
			"HTTP client and server boundary utilities with transport-safe defaults",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "http",
		contractReference: kernelReference("http"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "runtime-leaf",
	}),
	"@afenda/security": defineKernelPackage({
		admittedCapability:
			"Security primitives, request hardening, and cryptographic boundary utilities",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "security",
		contractReference: kernelReference("security"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "runtime-leaf",
	}),
	"@afenda/metrics": defineKernelPackage({
		admittedCapability:
			"Metrics emission, instrumentation contracts, and RED-oriented telemetry hooks",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "metrics",
		contractReference: kernelReference("metrics"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-leaf",
	}),
	"@afenda/openapi": defineKernelPackage({
		admittedCapability:
			"OpenAPI schema generation, projection utilities, and contract emission",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "openapi",
		contractReference: kernelReference("openapi"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "runtime-configured",
	}),
	"@afenda/rate-limit": defineKernelPackage({
		admittedCapability:
			"Rate limiting claim, window semantics, and conflict representation",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "rate-limit",
		contractReference: kernelReference("rate-limit"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-configured",
	}),
	"@afenda/cache": defineKernelPackage({
		admittedCapability:
			"Cache keying, TTL semantics, and invalidation contracts over injected stores",
		admissionState: "PROVISIONAL",
		band: "runtime",
		leaf: "cache",
		contractReference: kernelReference("cache"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-configured",
	}),
	"@afenda/idempotency": defineKernelPackage({
		admittedCapability:
			"Claim, release, replay, expiry, and conflict semantics over an injected idempotency store",
		admissionState: "PLANNED",
		band: "runtime",
		leaf: "idempotency",
		contractReference: kernelReference("idempotency"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-configured",
	}),
	"@afenda/observability": defineKernelPackage({
		admittedCapability:
			"Structured operational telemetry emission, context propagation, and canonical redaction",
		admissionState: "PLANNED",
		band: "runtime",
		leaf: "observability",
		contractReference: kernelReference("observability"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "runtime-leaf",
	}),
	"@afenda/db": defineKernelPackage({
		admittedCapability:
			"Database schema authority, connectivity, transaction capabilities, and RLS session binding",
		admissionState: "PROVISIONAL",
		band: "data-plane",
		leaf: "db",
		contractReference: kernelReference("db"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "OWNED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/audit": defineKernelPackage({
		admittedCapability:
			"Append-only audit fact contract and transaction-safe append mechanism",
		admissionState: "PROVISIONAL",
		band: "data-plane",
		leaf: "audit",
		contractReference: kernelReference("audit"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "OWNED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/events": defineKernelPackage({
		admittedCapability:
			"Event interoperability contract: envelope, versioning, serialization, and subscription interfaces",
		admissionState: "PROVISIONAL",
		band: "data-plane",
		leaf: "events",
		contractReference: kernelReference("events"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/search": defineKernelPackage({
		admittedCapability:
			"Search indexing contracts, query projections, and tenant-scoped discovery semantics",
		admissionState: "PROVISIONAL",
		band: "data-plane",
		leaf: "search",
		contractReference: kernelReference("search"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/notifications": defineKernelPackage({
		admittedCapability:
			"Notification delivery contracts, channel projections, and dispatch state semantics",
		admissionState: "PROVISIONAL",
		band: "data-plane",
		leaf: "notifications",
		contractReference: kernelReference("notifications"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/outbox": defineKernelPackage({
		admittedCapability:
			"Transactional outbox persistence, claim, publication coordination, and idempotent delivery state",
		admissionState: "PLANNED",
		band: "data-plane",
		leaf: "outbox",
		contractReference: kernelReference("outbox"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "OWNED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/numbering": defineKernelPackage({
		admittedCapability:
			"Tenant-defined series and gapless allocation per tenant, series, and period",
		admissionState: "PLANNED",
		band: "data-plane",
		leaf: "numbering",
		contractReference: kernelReference("numbering"),
		criticality: "C1",
		kind: "OPEN",
		persistence: "OWNED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/read-models": defineKernelPackage({
		admittedCapability:
			"Projection registration protocol, rebuild coordination, position tracking, and staleness reporting",
		admissionState: "PLANNED",
		band: "data-plane",
		leaf: "read-models",
		contractReference: kernelReference("read-models"),
		criticality: "C2",
		kind: "CLOSED",
		persistence: "INJECTED",
		surface: "root-capability",
		topologyProfile: "data-plane",
	}),
	"@afenda/auth": defineKernelPackage({
		admittedCapability:
			"Authentication session integration, organization identity, and Neon Auth boundary",
		admissionState: "PROVISIONAL",
		band: "control-plane",
		leaf: "auth",
		contractReference: kernelReference("auth"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "control-plane",
	}),
	"@afenda/admin": defineKernelPackage({
		admittedCapability:
			"Administrative operator capability and platform control surfaces",
		admissionState: "PROVISIONAL",
		band: "control-plane",
		leaf: "admin",
		contractReference: kernelReference("admin"),
		criticality: "C1",
		kind: "CLOSED",
		persistence: "NONE",
		surface: "root-capability",
		topologyProfile: "control-plane",
	}),
} satisfies KernelPackageRegistry);

export type KernelPackageName = keyof typeof KERNEL_PACKAGES;

export interface RegisteredKernelPackageForAdoption {
	readonly contractReference: string;
	readonly name: KernelPackageName;
	readonly path: string;
	/** Always present — topology profile from the package record. */
	readonly profile: KernelTopologyProfile;
	/**
	 * Only `tooling-only` is projected here. Root-capability is the adoption
	 * default (entrypoint + `"."` export required); tooling-only is the
	 * exception that must be named so consumers skip those checks.
	 */
	readonly surface?: Extract<KernelSurface, "tooling-only">;
}

/** Non-PLANNED kernel packages expected on disk for adoption surface checks. */
export const REGISTERED_KERNEL_PACKAGES_FOR_ADOPTION = Object.freeze(
	(
		Object.entries(KERNEL_PACKAGES) as [
			KernelPackageName,
			(typeof KERNEL_PACKAGES)[KernelPackageName],
		][]
	)
		.filter(([, record]) => record.admissionState !== "PLANNED")
		.map(([name, record]) =>
			Object.freeze({
				name,
				path: record.path,
				profile: record.topologyProfile,
				...(record.surface === "tooling-only"
					? { surface: "tooling-only" as const }
					: {}),
				contractReference: record.contractReference,
			}),
		)
		.sort((left, right) => compareAsciiOrdinal(left.name, right.name)),
);

export const KERNEL_PACKAGE_NAMES = Object.freeze(
	(Object.keys(KERNEL_PACKAGES) as KernelPackageName[]).sort(
		compareAsciiOrdinal,
	),
);

const KERNEL_PACKAGES_BY_BAND: Readonly<
	Record<KernelBand, readonly KernelPackageName[]>
> = Object.freeze(
	Object.fromEntries(
		(Object.keys(KERNEL_BAND_PATH_PREFIX) as KernelBand[]).map((band) => [
			band,
			Object.freeze(
				KERNEL_PACKAGE_NAMES.filter(
					(name) => KERNEL_PACKAGES[name].band === band,
				),
			),
		]),
	) as Record<KernelBand, readonly KernelPackageName[]>,
);

export const listKernelPackagesByBand = (
	band: KernelBand,
): readonly KernelPackageName[] => KERNEL_PACKAGES_BY_BAND[band];
