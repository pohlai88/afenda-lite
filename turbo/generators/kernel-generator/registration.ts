import { generatorContracts } from "../contracts.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { createKernelAdoptionAuthorityDoctorExtension } from "./adoption-authority.ts";

export const kernelGeneratorRegistration = createFamilyRegistration(
	generatorContracts.kernel,
	generatorContracts,
	{
		createDoctorExtension: createKernelAdoptionAuthorityDoctorExtension,
	},
);
