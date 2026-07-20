import type { LanguageModel } from "ai";

import type {
	ConversationContextInput,
	MachineModule,
	UiMessage,
} from "./schemas";

export type ConversationContext = ConversationContextInput;

export type MachineAssistant = {
	readonly module: MachineModule;
	readonly systemPrompt: string;
	readonly buildContext: (context: ConversationContext) => string;
};

export type CreateTheMachineConfig = {
	readonly model: LanguageModel;
	readonly maxOutputTokens?: number;
	readonly temperature?: number;
	readonly assistants?: readonly MachineAssistant[];
};

export type StreamChatInput = {
	readonly messages: readonly UiMessage[];
	readonly context: ConversationContext;
};

export type ChatResult = {
	readonly text: string;
	readonly module: MachineModule;
};

export type TheMachine = {
	stream(input: StreamChatInput): Promise<Response>;
	chat(input: StreamChatInput): Promise<ChatResult>;
	getAssistant(module: MachineModule): MachineAssistant;
};

export type IntentClassification = {
	readonly module: MachineModule;
	readonly action: "chat" | "help" | "query";
	readonly confidence: number;
};
