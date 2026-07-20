import {
	convertToModelMessages,
	generateText,
	type LanguageModel,
	streamText,
} from "ai";

import { DEFAULT_ASSISTANTS } from "./assistants";
import { DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_TEMPERATURE } from "./constants";
import { truncateContext } from "./context";
import { toAiSdkUiMessages } from "./map-ui-messages";
import type { MachineModule } from "./schemas";
import type {
	ChatResult,
	CreateTheMachineConfig,
	MachineAssistant,
	StreamChatInput,
	TheMachine,
} from "./types";

const MAX_SYSTEM_CONTEXT_TOKENS = 2_000;

function resolveAssistants(
	custom: readonly MachineAssistant[] | undefined,
): Map<MachineModule, MachineAssistant> {
	const map = new Map<MachineModule, MachineAssistant>();
	for (const assistant of custom ?? DEFAULT_ASSISTANTS) {
		map.set(assistant.module, assistant);
	}
	for (const fallback of DEFAULT_ASSISTANTS) {
		if (!map.has(fallback.module)) {
			map.set(fallback.module, fallback);
		}
	}
	return map;
}

function buildSystemPrompt(
	assistant: MachineAssistant,
	input: StreamChatInput,
): string {
	const moduleContext = truncateContext(
		assistant.buildContext(input.context),
		MAX_SYSTEM_CONTEXT_TOKENS,
	);
	return [
		assistant.systemPrompt,
		"",
		"--- Session context ---",
		moduleContext,
		"",
		"--- Rules ---",
		"- Never invent tenant or user records",
		"- Never ask for passwords or secrets",
		"- Prefer concise, actionable answers",
	].join("\n");
}

export function createMachineEngine(
	config: CreateTheMachineConfig,
): TheMachine {
	const model: LanguageModel = config.model;
	const maxOutputTokens = config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
	const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
	const assistants = resolveAssistants(config.assistants);

	function getAssistant(module: MachineModule): MachineAssistant {
		const assistant = assistants.get(module);
		if (assistant === undefined) {
			const general = assistants.get("general");
			if (general === undefined) {
				throw new Error("The Machine general assistant is not registered");
			}
			return general;
		}
		return assistant;
	}

	async function stream(input: StreamChatInput): Promise<Response> {
		const assistant = getAssistant(input.context.module);
		const system = buildSystemPrompt(assistant, input);
		const messages = await convertToModelMessages(
			toAiSdkUiMessages(input.messages),
		);

		const result = streamText({
			model,
			system,
			messages,
			maxOutputTokens,
			temperature,
		});

		return result.toUIMessageStreamResponse();
	}

	async function chat(input: StreamChatInput): Promise<ChatResult> {
		const assistant = getAssistant(input.context.module);
		const system = buildSystemPrompt(assistant, input);
		const messages = await convertToModelMessages(
			toAiSdkUiMessages(input.messages),
		);

		const result = await generateText({
			model,
			system,
			messages,
			maxOutputTokens,
			temperature,
		});

		return {
			text: result.text,
			module: input.context.module,
		};
	}

	return { stream, chat, getAssistant };
}
