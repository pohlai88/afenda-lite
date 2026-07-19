import type { ConversationContext } from "./types";

/** Rough token estimate — English ~1.3 tokens/word; CJK denser. */
export function estimateTokens(text: string): number {
	const hasCjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text);
	if (hasCjk) {
		return Math.ceil(text.length * 1.5);
	}
	const words = text.trim().split(/\s+/).filter(Boolean);
	return Math.ceil(words.length * 1.3);
}

export function truncateContext(context: string, maxTokens: number): string {
	const current = estimateTokens(context);
	if (current <= maxTokens) {
		return context;
	}

	const ratio = maxTokens / current;
	const keepChars = Math.max(64, Math.floor(context.length * ratio));
	const half = Math.floor(keepChars / 2);
	return `${context.slice(0, half)}\n...[truncated]...\n${context.slice(-half)}`;
}

export function buildMachineContextString(
	context: ConversationContext,
): string {
	return [
		`organizationId=${context.organizationId}`,
		`userId=${context.userId}`,
		`module=${context.module}`,
		`language=${context.language}`,
		`conversationId=${context.conversationId}`,
	].join("\n");
}
