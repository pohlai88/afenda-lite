import "server-only";

export {
	DEFAULT_ASSISTANTS,
	generalAssistant,
	identityAssistant,
	platformAssistant,
} from "./assistants";
export {
	DEFAULT_MACHINE_MODEL_ID,
	DEFAULT_MAX_OUTPUT_TOKENS,
	DEFAULT_TEMPERATURE,
	MACHINE_MODULES,
	MAX_CHAT_MESSAGE_CHARS,
	MAX_HISTORY_MESSAGES,
} from "./constants";
export {
	buildMachineContextString,
	estimateTokens,
	truncateContext,
} from "./context";
export { createTheMachine } from "./create-the-machine";
export { classifyIntent } from "./intent";
export { toAiSdkUiMessages } from "./map-ui-messages";
export {
	type ChatRequest,
	type ConversationContextInput,
	chatRequestSchema,
	conversationContextSchema,
	type MachineModule,
	machineConfigSchema,
	machineModuleSchema,
	type UiMessage,
	uiMessageSchema,
} from "./schemas";
export type {
	ChatResult,
	ConversationContext,
	CreateTheMachineConfig,
	IntentClassification,
	MachineAssistant,
	StreamChatInput,
	TheMachine,
} from "./types";
