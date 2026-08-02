import { generatorContracts } from "../contracts.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";

export const kernelGeneratorRegistration = createFamilyRegistration(
	generatorContracts.kernel,
	generatorContracts,
);
