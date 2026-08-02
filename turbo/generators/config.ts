import type {
	GeneratorFamilyRegistration,
	GeneratorRegistrar,
} from "./engine/family-registration.ts";
import { erpGeneratorRegistration } from "./erp-generator/registration.ts";
import { kernelGeneratorRegistration } from "./kernel-generator/registration.ts";

export const generatorRegistrations = Object.freeze([
	kernelGeneratorRegistration,
	erpGeneratorRegistration,
] satisfies readonly [
	GeneratorFamilyRegistration,
	GeneratorFamilyRegistration,
]);

export default function registerGenerators(plop: GeneratorRegistrar): void {
	for (const registration of generatorRegistrations) {
		registration.register(plop);
	}
}
