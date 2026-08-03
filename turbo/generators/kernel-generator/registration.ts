import { generatorContracts } from "../contracts.ts";
import type {
	GeneratorExplicitLocalCommand,
	GeneratorRegistrar,
} from "../engine/family-registration.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { parseGeneratorReconciliationPlan } from "../engine/reconciliation-planner.ts";
import { applyKernelAdoptionTreatments } from "./adoption-apply.ts";
import { createKernelAdoptionAuthorityDoctorExtension } from "./adoption-authority.ts";

const kernelBaseGeneratorRegistration = createFamilyRegistration(
	generatorContracts.kernel,
	generatorContracts,
	{
		createDoctorExtension: createKernelAdoptionAuthorityDoctorExtension,
	},
);

const APPLY_ADOPTION_GENERATOR_NAME =
	"kernel-generator-apply-adoption" as const;

export const kernelGeneratorApplyAdoptionName = APPLY_ADOPTION_GENERATOR_NAME;

export const kernelGeneratorRegistration = Object.freeze({
	...kernelBaseGeneratorRegistration,
	explicitLocalCommands: Object.freeze([
		{ name: APPLY_ADOPTION_GENERATOR_NAME, writes: true },
	] satisfies readonly GeneratorExplicitLocalCommand[]),
	register: (plop: GeneratorRegistrar): void => {
		kernelBaseGeneratorRegistration.register(plop);
		plop.setGenerator(APPLY_ADOPTION_GENERATOR_NAME, {
			description:
				"kernel generator (apply: reconcile kernel adoption surfaces)",
			prompts: [],
			actions: [
				async (
					_answers: Record<string, unknown>,
					_config: unknown,
					plopApi: { readonly getDestBasePath: () => string },
				) => {
					const repositoryRoot = plopApi.getDestBasePath();
					const planJson = await kernelBaseGeneratorRegistration.planUpgrade(
						repositoryRoot,
						{ format: "json" },
					);
					const parsedPlan = parseGeneratorReconciliationPlan(
						JSON.parse(planJson),
					);
					const result = await applyKernelAdoptionTreatments({
						repositoryRoot,
						plan: parsedPlan,
					});
					return `applied kernel adoption: changed=${result.filesChanged.length} skipped=${result.skipped.length}`;
				},
			],
		});
	},
});
