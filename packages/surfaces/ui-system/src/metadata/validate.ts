import type {
	ComponentEvidence,
	EvidenceKind,
	GovernanceDiagnostic,
	GovernanceValidationResult,
	GovernedCatalogComponent,
	GovernedComponentContract,
	UiCatalog,
	UiCatalogIssue,
	UiRepositorySnapshot,
} from "./contract";
import { UI_COMPONENT_CONTRACT_STANDARD } from "./contracts/manifest.contract";

const EXPECTED_PACKAGE_EXPORTS = [".", "./styles.css"] as const;
const FORBIDDEN_IMPORTS = [
	/from\s+["']apps\//,
	/from\s+["']@\/|from\s+["']@afenda\//,
	/from\s+["'](?:server-only|pg|drizzle-orm|next\/)/,
] as const;

function duplicates(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) repeated.add(value);
		seen.add(value);
	}
	return [...repeated].sort();
}

function occurrences(source: string, value: string): number {
	return source.split(value).length - 1;
}

export function validateUiCatalog(
	catalog: UiCatalog,
	snapshot: UiRepositorySnapshot,
): UiCatalogIssue[] {
	const issues: UiCatalogIssue[] = [];
	const catalogSources = catalog.components.map((entry) => entry.sourceModule);
	const catalogSourceSet = new Set<string>(catalogSources);
	const diskSources = Object.keys(snapshot.componentSources).sort();
	const catalogIds = catalog.components.map((entry) => entry.id);
	const capabilityIds = new Set(catalog.capabilities.map((entry) => entry.id));
	const componentIds = new Set(catalogIds);
	const qualityIds = new Set(catalog.qualityProfiles.map((entry) => entry.id));
	const surfaceIds = new Set(catalog.surfaceProfiles.map((entry) => entry.id));
	const tokenIds = new Set(catalog.tokenFamilies.map((entry) => entry.id));
	const evidencePaths = new Set(snapshot.evidencePaths);

	for (const duplicate of duplicates(catalogSources)) {
		issues.push({
			kind: "component-drift",
			message: `Duplicate component source metadata: ${duplicate}`,
		});
	}
	for (const duplicate of duplicates(catalogIds)) {
		issues.push({
			kind: "component-drift",
			message: `Duplicate component id: ${duplicate}`,
		});
	}
	for (const source of diskSources) {
		if (!catalogSourceSet.has(source)) {
			issues.push({
				kind: "component-drift",
				message: `Component source is not cataloged: ${source}`,
			});
		}
	}
	for (const source of catalogSources) {
		if (!diskSources.includes(source)) {
			issues.push({
				kind: "component-drift",
				message: `Cataloged component source is missing: ${source}`,
			});
		}
	}

	if (
		JSON.stringify([...snapshot.packageExportKeys].sort()) !==
		JSON.stringify([...EXPECTED_PACKAGE_EXPORTS].sort())
	) {
		issues.push({
			kind: "export-drift",
			message: `Package exports must remain ${EXPECTED_PACKAGE_EXPORTS.join(", ")}`,
		});
	}

	for (const component of catalog.components) {
		const moduleName = component.sourceModule
			.replace("src/components/ui/", "")
			.replace(/\.tsx?$/, "");
		if (!snapshot.barrelSource.includes(`./components/ui/${moduleName}`)) {
			issues.push({
				kind: "export-drift",
				message: `Cataloged component is missing from the flat barrel: ${component.id}`,
			});
		}
		const actualExports =
			snapshot.exportsBySource[component.sourceModule] ?? [];
		const expectedExports = [...component.publicExports].sort();
		if (
			JSON.stringify([...actualExports].sort()) !==
			JSON.stringify(expectedExports)
		) {
			issues.push({
				kind: "export-drift",
				message: `Public exports differ for ${component.sourceModule}`,
			});
		}
		const source = snapshot.componentSources[component.sourceModule] ?? "";
		const isClient = /^\s*["']use client["'];/m.test(source);
		if (component.renderMode === "client" && !isClient) {
			issues.push({
				kind: "boundary-drift",
				message: `Client component lacks its leaf directive: ${component.id}`,
			});
		}
		if (component.renderMode === "server-compatible" && isClient) {
			issues.push({
				kind: "boundary-drift",
				message: `Server-compatible component declares a client boundary: ${component.id}`,
			});
		}
		for (const pattern of FORBIDDEN_IMPORTS) {
			if (pattern.test(source)) {
				issues.push({
					kind: "boundary-drift",
					message: `Forbidden upward or server import in ${component.sourceModule}`,
				});
			}
		}
		for (const capability of component.capabilities) {
			if (!capabilityIds.has(capability)) {
				issues.push({
					kind: "capability-drift",
					message: `${component.id} references unknown capability ${capability}`,
				});
			}
		}
		for (const qualityProfile of component.qualityProfiles) {
			if (!qualityIds.has(qualityProfile)) {
				issues.push({
					kind: "quality-drift",
					message: `${component.id} references unknown quality profile ${qualityProfile}`,
				});
			}
		}
		for (const tokenFamily of component.tokenFamilies) {
			if (!tokenIds.has(tokenFamily)) {
				issues.push({
					kind: "token-drift",
					message: `${component.id} references unknown token family ${tokenFamily}`,
				});
			}
		}
		for (const evidence of component.evidence) {
			if (!evidencePaths.has(evidence.path)) {
				issues.push({
					kind: "quality-drift",
					message: `${component.id} evidence is missing: ${evidence.path}`,
				});
			}
		}
	}

	for (const capability of catalog.capabilities) {
		if (capability.providers.length === 0) {
			issues.push({
				kind: "capability-drift",
				message: `Capability has no provider: ${capability.id}`,
			});
		}
		for (const provider of capability.providers) {
			if (!componentIds.has(provider)) {
				issues.push({
					kind: "capability-drift",
					message: `${capability.id} references unknown provider ${provider}`,
				});
			}
		}
		if (
			catalog.baseline.state === "locked" &&
			capability.lifecycle !== "verified"
		) {
			issues.push({
				kind: "baseline-drift",
				message: `Locked baseline capability is not verified: ${capability.id}`,
			});
		}
	}

	for (const profile of catalog.qualityProfiles) {
		for (const evidenceKind of profile.requiredEvidence) {
			const providers = catalog.components.filter((component) =>
				component.qualityProfiles.includes(profile.id),
			);
			for (const provider of providers) {
				if (!provider.evidence.some((item) => item.kind === evidenceKind)) {
					issues.push({
						kind: "quality-drift",
						message: `${provider.id} lacks ${evidenceKind} evidence required by ${profile.id}`,
					});
				}
			}
		}
	}

	for (const profile of catalog.surfaceProfiles) {
		for (const capability of profile.capabilities) {
			if (!capabilityIds.has(capability)) {
				issues.push({
					kind: "surface-drift",
					message: `${profile.id} references unknown capability ${capability}`,
				});
			}
		}
	}
	for (const coverage of catalog.moduleCoverage) {
		for (const profile of coverage.profiles) {
			if (!surfaceIds.has(profile)) {
				issues.push({
					kind: "module-drift",
					message: `${coverage.moduleId} references unknown surface profile ${profile}`,
				});
			}
		}
	}
	const catalogModules = catalog.moduleCoverage
		.map((entry) => entry.moduleId)
		.sort();
	if (
		JSON.stringify(catalogModules) !==
		JSON.stringify([...snapshot.erpModuleIds].sort())
	) {
		issues.push({
			kind: "module-drift",
			message: "ERP module coverage does not match packages/erp",
		});
	}

	for (const tokenFamily of catalog.tokenFamilies) {
		for (const variable of tokenFamily.variables) {
			const minimum = tokenFamily.requiredThemes === "both" ? 2 : 1;
			if (occurrences(snapshot.tokenCss, `${variable}:`) < minimum) {
				issues.push({
					kind: "token-drift",
					message: `${variable} is incomplete for ${tokenFamily.requiredThemes}`,
				});
			}
		}
	}

	return issues;
}

const VERIFIED_REQUIRED_EVIDENCE = [
	"contract",
	"unit",
	"interaction",
	"accessibility",
	"visual",
	"contrast",
] as const satisfies readonly EvidenceKind[];

function normalizeClauseForComparison(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateClauseSection(input: {
	readonly component: string;
	readonly section: string;
	readonly value: unknown;
	readonly missingCode?:
		| "missing_contract_ownership"
		| "missing_semantic_boundary";
}): GovernanceDiagnostic[] {
	const diagnostics: GovernanceDiagnostic[] = [];
	if (!Array.isArray(input.value) || input.value.length === 0) {
		diagnostics.push({
			severity: "error",
			code: input.missingCode ?? "invalid_contract_clause",
			component: input.component,
			message: `Contract section "${input.section}" requires at least one clause.`,
		});
		return diagnostics;
	}

	const seen = new Set<string>();
	for (const clause of input.value) {
		if (typeof clause !== "string" || clause.trim().length === 0) {
			diagnostics.push({
				severity: "error",
				code: "invalid_contract_clause",
				component: input.component,
				message: `Contract section "${input.section}" contains an empty or non-text clause.`,
			});
			continue;
		}

		const normalized = normalizeClauseForComparison(clause);
		if (seen.has(normalized)) {
			diagnostics.push({
				severity: "error",
				code: "duplicate_contract_clause",
				component: input.component,
				message: `Contract section "${input.section}" contains duplicate clause "${clause.trim()}".`,
			});
			continue;
		}
		seen.add(normalized);
	}

	return diagnostics;
}

function validateUsageRuleSections(input: {
	readonly component: string;
	readonly axis: "approvedVariants" | "approvedSizes";
	readonly value: unknown;
}): GovernanceDiagnostic[] {
	if (input.value === undefined) return [];
	if (!isRecord(input.value)) {
		return [
			{
				severity: "error",
				code: "invalid_contract_clause",
				component: input.component,
				message: `Contract section "${input.axis}" must be a rule map.`,
			},
		];
	}

	const diagnostics: GovernanceDiagnostic[] = [];
	for (const [name, rule] of Object.entries(input.value)) {
		const section = `${input.axis}.${name}`;
		if (!isRecord(rule)) {
			diagnostics.push({
				severity: "error",
				code: "invalid_contract_clause",
				component: input.component,
				message: `Contract section "${section}" must be a usage rule.`,
			});
			continue;
		}
		if (typeof rule.meaning !== "string" || rule.meaning.trim().length === 0) {
			diagnostics.push({
				severity: "error",
				code: "invalid_contract_clause",
				component: input.component,
				message: `Contract section "${section}.meaning" requires a non-empty clause.`,
			});
		}
		diagnostics.push(
			...validateClauseSection({
				component: input.component,
				section: `${section}.allowedWhen`,
				value: rule.allowedWhen,
			}),
		);
		if (rule.prohibitedWhen !== undefined) {
			diagnostics.push(
				...validateClauseSection({
					component: input.component,
					section: `${section}.prohibitedWhen`,
					value: rule.prohibitedWhen,
				}),
			);
		}
	}
	return diagnostics;
}

function validateContractShape(
	component: string,
	contract: GovernedComponentContract,
): GovernanceDiagnostic[] {
	const diagnostics: GovernanceDiagnostic[] = [];
	const runtimeValue: unknown = contract;
	if (!isRecord(runtimeValue)) {
		return [
			{
				severity: "error",
				code: "invalid_contract_clause",
				component,
				message: "Component contract must be an object.",
			},
		];
	}
	const runtimeContract = runtimeValue;

	if (runtimeContract.standard !== UI_COMPONENT_CONTRACT_STANDARD) {
		diagnostics.push({
			severity: "error",
			code: "invalid_contract_standard",
			component,
			message: `Contract standard must be "${UI_COMPONENT_CONTRACT_STANDARD}".`,
		});
	}

	if (
		typeof runtimeContract.purpose !== "string" ||
		runtimeContract.purpose.trim().length === 0
	) {
		diagnostics.push({
			severity: "error",
			code: "invalid_contract_clause",
			component,
			message: 'Contract section "purpose" requires a non-empty clause.',
		});
	}

	const ownership = runtimeContract.ownership;
	if (!isRecord(ownership)) {
		diagnostics.push({
			severity: "error",
			code: "missing_contract_ownership",
			component,
			message:
				"Contract ownership requires componentOwns and consumerOwns clauses.",
		});
	} else {
		diagnostics.push(
			...validateClauseSection({
				component,
				section: "ownership.componentOwns",
				value: ownership.componentOwns,
				missingCode: "missing_contract_ownership",
			}),
			...validateClauseSection({
				component,
				section: "ownership.consumerOwns",
				value: ownership.consumerOwns,
				missingCode: "missing_contract_ownership",
			}),
		);
	}

	diagnostics.push(
		...validateClauseSection({
			component,
			section: "semanticBoundaries",
			value: runtimeContract.semanticBoundaries,
			missingCode: "missing_semantic_boundary",
		}),
		...validateClauseSection({
			component,
			section: "rules",
			value: runtimeContract.rules,
		}),
		...validateClauseSection({
			component,
			section: "accessibility",
			value: runtimeContract.accessibility,
		}),
		...validateClauseSection({
			component,
			section: "prohibitedUsage",
			value: runtimeContract.prohibitedUsage,
		}),
		...validateUsageRuleSections({
			component,
			axis: "approvedVariants",
			value: runtimeContract.approvedVariants,
		}),
		...validateUsageRuleSections({
			component,
			axis: "approvedSizes",
			value: runtimeContract.approvedSizes,
		}),
	);

	return diagnostics;
}

function compareClosedSet(input: {
	readonly component: string;
	readonly axis: "variant" | "size";
	readonly actual: readonly string[];
	readonly approved: readonly string[];
}): GovernanceDiagnostic[] {
	const diagnostics: GovernanceDiagnostic[] = [];
	const actual = new Set(input.actual);
	const approved = new Set(input.approved);

	for (const value of approved) {
		if (!actual.has(value)) {
			diagnostics.push({
				severity: "error",
				code: input.axis === "variant" ? "missing_variant" : "missing_size",
				component: input.component,
				message: `Approved ${input.axis} "${value}" is missing from the implementation.`,
			});
		}
	}

	for (const value of actual) {
		if (!approved.has(value)) {
			diagnostics.push({
				severity: "error",
				code:
					input.axis === "variant" ? "unexpected_variant" : "unexpected_size",
				component: input.component,
				message: `Implementation exposes unapproved ${input.axis} "${value}".`,
			});
		}
	}

	return diagnostics;
}

function validateEvidence(
	component: string,
	evidence: readonly ComponentEvidence[],
): GovernanceDiagnostic[] {
	const diagnostics: GovernanceDiagnostic[] = [];
	const seen = new Set<string>();

	for (const item of evidence) {
		const key = `${item.kind}:${item.file}:${item.target}`;

		if (seen.has(key)) {
			diagnostics.push({
				severity: "warning",
				code: "unexpected_evidence",
				component,
				message: `Duplicate evidence entry "${key}".`,
			});
			continue;
		}
		seen.add(key);

		if (item.file.trim().length === 0 || item.target.trim().length === 0) {
			diagnostics.push({
				severity: "error",
				code: "invalid_evidence",
				component,
				message: `Evidence "${item.kind}" requires a non-empty file and target.`,
			});
		}
	}

	return diagnostics;
}

export function validateComponentGovernance(
	components: readonly GovernedCatalogComponent[],
): GovernanceValidationResult {
	const diagnostics: GovernanceDiagnostic[] = [];
	const seenComponents = new Set<string>();

	for (const component of components) {
		if (seenComponents.has(component.name)) {
			diagnostics.push({
				severity: "error",
				code: "duplicate_component",
				component: component.name,
				message: `Duplicate component catalogue entry "${component.name}".`,
			});
			continue;
		}
		seenComponents.add(component.name);

		const governance = component.governance ?? {
			lifecycle: "candidate" as const,
		};
		const contract = governance.contract;
		const evidence = governance.evidence ?? [];

		if (
			(governance.lifecycle === "approved" ||
				governance.lifecycle === "verified") &&
			!contract
		) {
			diagnostics.push({
				severity: "error",
				code: "missing_contract",
				component: component.name,
				message: `${governance.lifecycle} components require a governed contract.`,
			});
		}

		if (contract && contract.component !== component.name) {
			diagnostics.push({
				severity: "error",
				code: "contract_component_mismatch",
				component: component.name,
				message: `Contract "${contract.id}" governs "${contract.component}", not "${component.name}".`,
			});
		}

		if (contract) {
			diagnostics.push(...validateContractShape(component.name, contract));
		}

		if (governance.lifecycle === "deprecated" && !governance.deprecatedBy) {
			diagnostics.push({
				severity: "error",
				code: "missing_deprecation_replacement",
				component: component.name,
				message: "Deprecated components must declare deprecatedBy.",
			});
		}

		diagnostics.push(...validateEvidence(component.name, evidence));

		if (governance.lifecycle === "verified") {
			const evidenceKinds = new Set(evidence.map((item) => item.kind));

			for (const requiredKind of VERIFIED_REQUIRED_EVIDENCE) {
				if (!evidenceKinds.has(requiredKind)) {
					diagnostics.push({
						severity: "error",
						code: "missing_evidence",
						component: component.name,
						message: `Verified component is missing explicit "${requiredKind}" evidence.`,
					});
				}
			}
		}

		if (contract?.approvedVariants) {
			diagnostics.push(
				...compareClosedSet({
					component: component.name,
					axis: "variant",
					actual: component.variants ?? [],
					approved: Object.keys(contract.approvedVariants),
				}),
			);
		}

		if (contract?.approvedSizes) {
			diagnostics.push(
				...compareClosedSet({
					component: component.name,
					axis: "size",
					actual: component.sizes ?? [],
					approved: Object.keys(contract.approvedSizes),
				}),
			);
		}
	}

	return {
		ok: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
		diagnostics,
	};
}

export const validateGovernance = validateComponentGovernance;
