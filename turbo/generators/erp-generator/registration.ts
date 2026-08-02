import { generatorContracts } from "../contracts.ts";
import { createFamilyRegistration } from "../engine/family-registration.ts";
import { createErpManifestAuthorityDoctorExtension } from "./manifest-authority.ts";

export const erpGeneratorRegistration = createFamilyRegistration(
	generatorContracts.erp,
	generatorContracts,
	{
		createDoctorExtension: createErpManifestAuthorityDoctorExtension,
	},
);
