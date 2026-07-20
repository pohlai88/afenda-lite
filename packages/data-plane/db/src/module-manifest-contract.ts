/**
 * Afenda ERP module manifest contract (Phase 2 governance).
 * Authority: docs-V2/monorepo · packages_refactor_v2.3 (accepted reference).
 * Types only — no runtime I/O.
 */

export type PackageLifecycle =
	| "scaffolded"
	| "active"
	| "deprecated"
	| "retired";

export type ModuleActivationMode = "core" | "organization_toggle";

export type ModuleIntegrationStyle = "events" | "ports" | "app-saga";

export type AuthorizationMap<
	TOperation extends string,
	TPermission extends string,
> = Readonly<Record<TOperation, TPermission>>;

export interface AfendaModuleManifest {
	readonly id: string;
	readonly category: string;
	readonly packageName: `@afenda/${string}`;
	readonly band: "R1-F";
	readonly lifecycle: PackageLifecycle;
	readonly activationMode: ModuleActivationMode;

	readonly owns: {
		readonly aggregates: readonly string[];
		readonly commandNamespace: string;
		readonly commands: readonly string[];
		readonly queryNamespace: string;
		readonly queries: readonly string[];
	};

	readonly persistence: {
		readonly schemaOwner: "@afenda/db";
		readonly mutationTables: readonly string[];
	};

	readonly events: {
		readonly namespace: string;
		readonly emits: readonly string[];
		readonly consumes: readonly string[];
	};

	readonly permissions: {
		readonly namespace: string;
		readonly codes: readonly string[];
	};

	readonly authorization: {
		readonly commands: Readonly<Record<string, string>>;
		readonly queries: Readonly<Record<string, string>>;
	};

	readonly moduleDependencies: {
		readonly required: readonly string[];
	};

	readonly optionalIntegratesWith: readonly {
		readonly moduleId: string;
		readonly style: ModuleIntegrationStyle;
	}[];
}
