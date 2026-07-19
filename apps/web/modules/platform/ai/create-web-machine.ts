import {
	createTheMachine,
	DEFAULT_MACHINE_MODEL_ID,
	type TheMachine,
} from "@afenda/ai-the-machine";
import { env, isVercelRuntimeNow } from "@afenda/env";
import { createGateway } from "ai";

/**
 * Resolve whether The Machine can call AI Gateway.
 * Local: requires AI_GATEWAY_API_KEY. Vercel: key or OIDC path.
 */
export function canReachAiGateway(): boolean {
	if (env.AI_GATEWAY_API_KEY !== undefined) {
		return true;
	}
	return isVercelRuntimeNow();
}

export function createWebTheMachine(): TheMachine {
	const gateway =
		env.AI_GATEWAY_API_KEY !== undefined
			? createGateway({ apiKey: env.AI_GATEWAY_API_KEY })
			: createGateway();

	const modelId = env.AI_THE_MACHINE_MODEL ?? DEFAULT_MACHINE_MODEL_ID;
	return createTheMachine({
		model: gateway(modelId),
	});
}
