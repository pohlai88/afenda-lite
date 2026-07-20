import { createMachineEngine } from "./engine";
import { machineConfigSchema } from "./schemas";
import type { CreateTheMachineConfig, TheMachine } from "./types";

/**
 * Factory: create a configured The Machine engine.
 * Web injects a Gateway `LanguageModel` — this package does not read env.
 */
export function createTheMachine(config: CreateTheMachineConfig): TheMachine {
	const parsed = machineConfigSchema.parse({
		maxOutputTokens: config.maxOutputTokens,
		temperature: config.temperature,
	});

	return createMachineEngine({
		model: config.model,
		...(parsed.maxOutputTokens !== undefined
			? { maxOutputTokens: parsed.maxOutputTokens }
			: {}),
		...(parsed.temperature !== undefined
			? { temperature: parsed.temperature }
			: {}),
		...(config.assistants !== undefined
			? { assistants: config.assistants }
			: {}),
	});
}
