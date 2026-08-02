export type GeneratorFamily = "kernel" | "erp";

export type GeneratorName = `${GeneratorFamily}-generator`;

export type ContractRelease =
	| { readonly state: "internal" }
	| { readonly state: "authoritative"; readonly version: number };

export type ContractCapabilityDefinition =
	| {
			readonly id: string;
			readonly status: "declared";
	  }
	| {
			readonly id: string;
			readonly status: "authoritative";
			readonly authorityVersion: number;
	  };

export type GeneratorModeId =
	| "create"
	| "add-feature"
	| "doctor"
	| "plan-upgrade"
	| "reconcile"
	| "upgrade"
	| "project"
	| "verify";

export interface GeneratorModeDefinition {
	readonly id: GeneratorModeId;
	readonly writes: boolean;
}

export interface GeneratorProfileDefinition {
	readonly id: string;
}

export interface SemanticInputPolicy {
	readonly adapter: string;
	readonly canonicalOwners: readonly string[];
}

export interface PathPolicy {
	readonly workspaceRoots: readonly string[];
}

export type FileDispositionKind =
	| "managed"
	| "projected"
	| "patched"
	| "canonical"
	| "unmanaged";

export interface FileDispositionDefinition {
	readonly capability: string;
	readonly disposition: FileDispositionKind;
	readonly owner: string;
	readonly path: string;
}

export interface NamingPolicy {
	readonly directories: "kebab-case";
	readonly files: "kebab-case";
}

export interface EntrypointPolicy {
	readonly auxiliary: readonly string[];
	readonly root: string;
}

export interface DependencyPolicy {
	readonly authorizationOwner: string;
	readonly discoveryAuthorizes: false;
}

export interface TaskPolicy {
	readonly requiredScripts: readonly string[];
}

export type ProjectionCompliance = "normative" | "informational";

export interface ProjectionDefinition {
	readonly canonicalInputs: readonly string[];
	readonly capability: string;
	readonly compliance: ProjectionCompliance;
	readonly id: string;
	readonly path: string;
}

export type DiagnosticSeverity = "info" | "warning" | "error" | "blocked";

export type DiagnosticTreatment =
	| "auto-reconcile"
	| "auto-upgrade"
	| "auto-regenerate"
	| "remove-superseded"
	| "semantic-decision-required"
	| "collision"
	| "unsupported";

export interface DiagnosticDefinition {
	readonly capability: string;
	readonly code: string;
	readonly severity: DiagnosticSeverity;
	readonly treatment: DiagnosticTreatment;
}

export interface MigrationDefinition {
	readonly from: number;
	readonly id: string;
	readonly to: number;
}

export interface GeneratorFamilyContractDefinition {
	readonly capabilities: readonly ContractCapabilityDefinition[];
	readonly dependencyPolicy: DependencyPolicy;
	readonly diagnostics: readonly DiagnosticDefinition[];
	readonly engineCompatibility: number;
	readonly entrypointPolicy: EntrypointPolicy;
	readonly family: GeneratorFamily;
	readonly filePolicy: readonly FileDispositionDefinition[];
	readonly migrations: readonly MigrationDefinition[];
	readonly modes: readonly GeneratorModeDefinition[];
	readonly namingPolicy: NamingPolicy;
	readonly pathPolicy: PathPolicy;
	readonly profiles: readonly GeneratorProfileDefinition[];
	readonly projections: readonly ProjectionDefinition[];
	readonly release: ContractRelease;
	readonly semanticInput: SemanticInputPolicy;
	readonly taskPolicy: TaskPolicy;
}

export interface GeneratorContractRegistry {
	readonly erp: GeneratorFamilyContractDefinition;
	readonly kernel: GeneratorFamilyContractDefinition;
}
