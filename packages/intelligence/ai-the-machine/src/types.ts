import type { LanguageModel } from "ai";

import type {
	ConversationContextInput,
	MachineModule,
	UiMessage,
} from "./schemas";

export type ConversationContext = ConversationContextInput;

export interface MachineAssistant {
	readonly buildContext: (context: ConversationContext) => string;
	readonly module: MachineModule;
	readonly systemPrompt: string;
}

export interface CreateTheMachineConfig {
	readonly assistants?: readonly MachineAssistant[];
	readonly maxOutputTokens?: number;
	readonly model: LanguageModel;
	readonly temperature?: number;
}

export interface StreamChatInput {
	readonly context: ConversationContext;
	readonly messages: readonly UiMessage[];
}

export interface ChatResult {
	readonly module: MachineModule;
	readonly text: string;
}

export interface TheMachine {
	chat: (input: StreamChatInput) => Promise<ChatResult>;
	getAssistant: (module: MachineModule) => MachineAssistant;
	stream: (input: StreamChatInput) => Promise<Response>;
}

export interface IntentClassification {
	readonly action: "chat" | "help" | "query";
	readonly confidence: number;
	readonly module: MachineModule;
}
