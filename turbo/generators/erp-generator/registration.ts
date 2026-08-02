import { generatorContracts } from "../contracts.ts";
import type {
	GeneratorDoctorExtension,
	GeneratorRegistrar,
} from "../engine/family-registration.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { parseGeneratorReconciliationPlan } from "../engine/reconciliation-planner.ts";
import { applyErpFeatureScaffold } from "./feature-scaffold.ts";
import { createErpLayoutAuthorityDoctorExtension } from "./layout-authority.ts";
import { createErpManifestAuthorityDoctorExtension } from "./manifest-authority.ts";
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
	register: (plop: GeneratorRegistrar): void => {
		erpBaseGeneratorRegistration.register(plop);
		plop.setGenerator(CREATE_PACKAGE_GENERATOR_NAME, {
			description:
				"erp generator (create package: explicit semantic package scaffold)",
			prompts: [
				{
					type: "input",
					name: "moduleId",
					message: "ERP module id (kebab-case)",
				},
				{
					type: "input",
					name: "category",
					message: "ERP module category (kebab-case)",
				},
			],
			actions: [
				async (
					answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const moduleId =
						typeof answers.moduleId === "string" ? answers.moduleId : "";
					const category =
						typeof answers.category === "string" ? answers.category : "";
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
				{
					type: "input",
					name: "moduleId",
					message: "ERP module id (kebab-case)",
				},
				{
					type: "input",
					name: "featureId",
					message: "ERP feature id (kebab-case)",
				},
			],
			actions: [
				async (
					answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const moduleId =
						typeof answers.moduleId === "string" ? answers.moduleId : "";
					const featureId =
						typeof answers.featureId === "string" ? answers.featureId : "";
					const result = await applyErpFeatureScaffold({
						repositoryRoot: plopApi.getDestBasePath(),
						spec: { moduleId, featureId },
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
