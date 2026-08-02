import { loadGeneratorContractRegistry } from "./engine/contract-loader.ts";
import { erpContractDefinition } from "./erp-generator/contract.ts";
import { kernelContractDefinition } from "./kernel-generator/contract.ts";

export const generatorContracts = loadGeneratorContractRegistry([
	kernelContractDefinition,
	erpContractDefinition,
]);
