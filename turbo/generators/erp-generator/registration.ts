import { generatorContracts } from "../contracts.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";

export const erpGeneratorRegistration = createFamilyRegistration(
	generatorContracts.erp,
	generatorContracts,
);
