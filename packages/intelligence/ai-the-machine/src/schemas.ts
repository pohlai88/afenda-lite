import { z } from "zod";

import {
	MACHINE_MODULES,
	MAX_CHAT_MESSAGE_CHARS,
	MAX_HISTORY_MESSAGES,
} from "./constants";

export const machineModuleSchema = z.enum(MACHINE_MODULES);

/**
 * Minimal UIMessage wire shape for useChat → RH.
 * Text parts enforce max length; other part kinds pass through for AI SDK convert.
 */
const uiMessagePartSchema = z
	.object({
		type: z.string().min(1),
	})
	.passthrough()
	.superRefine((part, ctx) => {
		if (part.type !== "text") {
			return;
		}
		const text = "text" in part ? part.text : undefined;
		if (typeof text !== "string") {
			ctx.addIssue({
				code: "custom",
				message: "text part requires string text",
				path: ["text"],
			});
			return;
		}
		if (text.length > MAX_CHAT_MESSAGE_CHARS) {
			ctx.addIssue({
				code: "too_big",
				origin: "string",
				maximum: MAX_CHAT_MESSAGE_CHARS,
				inclusive: true,
				path: ["text"],
				message: `text exceeds ${MAX_CHAT_MESSAGE_CHARS} characters`,
			});
		}
	});

export const uiMessageSchema = z.object({
	id: z.string().min(1),
	role: z.enum(["system", "user", "assistant"]),
	parts: z.array(uiMessagePartSchema).min(1),
});

/** Client body — never includes userId / organizationId (server mints those). */
export const chatRequestSchema = z.object({
	messages: z.array(uiMessageSchema).min(1).max(MAX_HISTORY_MESSAGES),
	module: machineModuleSchema.optional(),
});

export const conversationContextSchema = z.object({
	conversationId: z.string().min(1),
	userId: z.string().min(1),
	organizationId: z.string().min(1),
	module: machineModuleSchema,
	language: z.enum(["en"]).default("en"),
});

export const machineConfigSchema = z.object({
	maxOutputTokens: z.number().int().positive().max(32_768).optional(),
	temperature: z.number().min(0).max(2).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ConversationContextInput = z.infer<
	typeof conversationContextSchema
>;
export type MachineModule = z.infer<typeof machineModuleSchema>;
export type UiMessage = z.infer<typeof uiMessageSchema>;
