import type { PlopTypes } from "@turbo/gen";

import { generatorContracts } from "../contracts.ts";
import type {
	GeneratorDoctorExtension,
	GeneratorExplicitLocalCommand,
	GeneratorRegistrar,
} from "../engine/family-registration.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { parseGeneratorReconciliationPlan } from "../engine/reconciliation-planner.ts";
import { applyErpFeatureScaffold } from "./feature-scaffold.ts";
import { createErpLayoutAuthorityDoctorExtension } from "./layout-authority.ts";
import { createErpManifestAuthorityDoctorExtension } from "./manifest-authority.ts";
import { isErpKebabCase, normalizeErpIdInput } from "./naming.ts";
import { applyErpPackageScaffold } from "./package-scaffold.ts";
import { applyErpProjectionLocks } from "./projection-lock-apply.ts";
import { createErpProjectionLockAuthorityDoctorExtension } from "./projection-lock-authority.ts";
import {
	createErpTreatmentPlan,
	renderErpTreatmentPlanTextLines,
} from "./treatment-authority.ts";

const createErpDoctorExtension: NonNullable<
	Parameters<typeof createFamilyRegistration>[2]
>["createDoctorExtension"] = async (input) => {
	const [manifest, layout, projectionLock] = await Promise.all([
		createErpManifestAuthorityDoctorExtension(input),
		createErpLayoutAuthorityDoctorExtension(input),
		createErpProjectionLockAuthorityDoctorExtension(input),
	]);
	const diagnostics = Object.freeze([
		...manifest.diagnostics,
		...layout.diagnostics,
		...projectionLock.diagnostics,
	]);
	const treatmentPlan = createErpTreatmentPlan({ diagnostics });
	const treatmentTextLines = renderErpTreatmentPlanTextLines(treatmentPlan);
	return Object.freeze({
		kind: "erp-authority",
		json: Object.freeze({
			kind: "erp-authority",
			manifest: manifest.json,
			layout: layout.json,
			projectionLock: projectionLock.json,
			treatment: Object.freeze({
				kind: "erp-treatment-authority",
				plan: treatmentPlan,
				textLines: treatmentTextLines,
			}),
			textLines: Object.freeze([
				...manifest.textLines,
				...layout.textLines,
				...projectionLock.textLines,
				...treatmentTextLines,
			]),
		}),
		diagnostics,
		textLines: Object.freeze([
			...manifest.textLines,
			...layout.textLines,
			...projectionLock.textLines,
			...treatmentTextLines,
		]),
	} satisfies GeneratorDoctorExtension);
};

const erpBaseGeneratorRegistration = createFamilyRegistration(
	generatorContracts.erp,
	generatorContracts,
	{
		createDoctorExtension: createErpDoctorExtension,
	},
);

class ErpGeneratorPromptError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErpGeneratorPromptError";
	}
}

/**
 * `turbo gen … --args` hands `validate` the raw positional string, while an
 * interactive prompt hands it the already-filtered value. Normalizing inside
 * `validate` is what keeps the two entrypoints agreeing on padded input.
 */
const requiredKebabPrompt = ({
	example,
	label,
	message,
	name,
}: {
	readonly example: string;
	readonly label: string;
	readonly message: string;
	readonly name: string;
}): PlopTypes.PromptQuestion => ({
	type: "input",
	name,
	message,
	filter: (value: unknown): string => normalizeErpIdInput(value),
	validate: (value: unknown): true | string =>
		isErpKebabCase(normalizeErpIdInput(value))
			? true
			: `${label} must be kebab-case (example: ${example})`,
});

const MODULE_ID_PROMPT = requiredKebabPrompt({
	name: "moduleId",
	message: "ERP module id (kebab-case)",
	label: "ERP module id",
	example: "human-resources",
});

/**
 * Prompt-level validation only covers answers the prompt actually collected.
 * `--args` may supply fewer positions than there are prompts, and the scaffolds
 * are also called programmatically, so the action re-checks and fails closed
 * rather than coercing a missing answer into an empty string.
 */
const requireErpId = (
	answers: Record<string, unknown>,
	key: string,
): string => {
	const value = normalizeErpIdInput(answers[key]);
	if (!isErpKebabCase(value)) {
		throw new ErpGeneratorPromptError(
			`${key} answer is missing or not kebab-case; supply it interactively or via --args`,
		);
	}
	return value;
};

const readOptionalErpId = (
	answers: Record<string, unknown>,
	key: string,
): string | undefined => {
	const value = normalizeErpIdInput(answers[key]);
	if (value.length === 0) {
		return;
	}
	if (!isErpKebabCase(value)) {
		throw new ErpGeneratorPromptError(`${key} answer is not kebab-case`);
	}
	return value;
};

const CREATE_PACKAGE_GENERATOR_NAME = "erp-generator-create-package" as const;
const ADD_FEATURE_GENERATOR_NAME = "erp-generator-add-feature" as const;
const RECONCILE_PROJECTION_LOCKS_GENERATOR_NAME =
	"erp-generator-reconcile-projection-locks" as const;

export const erpGeneratorCreatePackageName = CREATE_PACKAGE_GENERATOR_NAME;
export const erpGeneratorAddFeatureName = ADD_FEATURE_GENERATOR_NAME;
export const erpGeneratorReconcileProjectionLocksName =
	RECONCILE_PROJECTION_LOCKS_GENERATOR_NAME;

export const erpGeneratorRegistration = Object.freeze({
	...erpBaseGeneratorRegistration,
	explicitLocalCommands: Object.freeze([
		{ name: CREATE_PACKAGE_GENERATOR_NAME, writes: true },
		{ name: ADD_FEATURE_GENERATOR_NAME, writes: true },
		{ name: RECONCILE_PROJECTION_LOCKS_GENERATOR_NAME, writes: true },
	] satisfies readonly GeneratorExplicitLocalCommand[]),
	register: (plop: GeneratorRegistrar): void => {
		erpBaseGeneratorRegistration.register(plop);
		plop.setGenerator(CREATE_PACKAGE_GENERATOR_NAME, {
			description:
				"erp generator (create package: explicit semantic package scaffold)",
			prompts: [
				MODULE_ID_PROMPT,
				requiredKebabPrompt({
					name: "category",
					message: "ERP module category (kebab-case)",
					label: "ERP module category",
					example: "operations",
				}),
			],
			actions: [
				async (
					answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const moduleId = requireErpId(answers, "moduleId");
					const category = requireErpId(answers, "category");
					const result = await applyErpPackageScaffold({
						repositoryRoot: plopApi.getDestBasePath(),
						spec: { moduleId, category },
					});
					return `created ${result.packagePath} (${result.filesWritten.length} files)`;
				},
			],
		});
		plop.setGenerator(ADD_FEATURE_GENERATOR_NAME, {
			description:
				"erp generator (add feature: explicit semantic feature scaffold)",
			prompts: [
				MODULE_ID_PROMPT,
				requiredKebabPrompt({
					name: "featureId",
					message: "ERP feature id (kebab-case)",
					label: "ERP feature id",
					example: "employee-relations",
				}),
				{
					// Blank is a real answer here: it means an ungrouped feature. A
					// function-valued `when` would express that more directly but makes
					// the prompt un-bypassable, so `--args` could no longer reach it.
					type: "input",
					name: "groupId",
					message:
						"ERP feature group id (kebab-case, blank for an ungrouped feature)",
					filter: (value: unknown): string => normalizeErpIdInput(value),
					validate: (value: unknown): true | string => {
						const candidate = normalizeErpIdInput(value);
						return candidate.length === 0 || isErpKebabCase(candidate)
							? true
							: "ERP feature group id must be kebab-case or blank (example: talent)";
					},
				},
			],
			actions: [
				async (
					answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const moduleId = requireErpId(answers, "moduleId");
					const featureId = requireErpId(answers, "featureId");
					const groupId = readOptionalErpId(answers, "groupId");
					const result = await applyErpFeatureScaffold({
						repositoryRoot: plopApi.getDestBasePath(),
						spec: {
							moduleId,
							featureId,
							...(groupId === undefined ? {} : { groupId }),
						},
					});
					return `created ${result.featurePath} (${result.filesWritten.length} files)`;
				},
			],
		});
		plop.setGenerator(RECONCILE_PROJECTION_LOCKS_GENERATOR_NAME, {
			description:
				"erp generator (apply: reconcile missing projection lock files)",
			prompts: [],
			actions: [
				async (
					_answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const repositoryRoot = plopApi.getDestBasePath();
					const planJson = await erpBaseGeneratorRegistration.planUpgrade(
						repositoryRoot,
						{ format: "json" },
					);
					const parsedPlan = parseGeneratorReconciliationPlan(
						JSON.parse(planJson),
					);
					const result = await applyErpProjectionLocks({
						repositoryRoot,
						plan: parsedPlan,
					});
					return `reconciled projection locks: written=${result.filesWritten.length} skipped=${result.skipped.length}`;
				},
			],
		});
	},
});
