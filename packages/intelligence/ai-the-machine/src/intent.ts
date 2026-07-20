import type { MachineModule } from "./schemas";
import type { IntentClassification } from "./types";

type IntentPattern = {
	readonly regex: RegExp;
	readonly module: MachineModule;
	readonly action: IntentClassification["action"];
	readonly confidence: number;
};

const INTENT_PATTERNS: readonly IntentPattern[] = [
	{
		regex: /\b(org|organization|tenant|rbac|role|permission|member|invite)\b/i,
		module: "platform",
		action: "query",
		confidence: 0.85,
	},
	{
		regex: /\b(user|session|sign[\s-]?in|password|account|profile|identity)\b/i,
		module: "identity",
		action: "query",
		confidence: 0.85,
	},
	{
		regex: /\b(help|how\s+to|guide|docs?)\b/i,
		module: "general",
		action: "help",
		confidence: 0.8,
	},
];

/**
 * Lightweight keyword router for assistant selection.
 * Server may override with an explicit `module` from the chat request.
 */
export function classifyIntent(message: string): IntentClassification {
	const trimmed = message.trim();
	if (trimmed.length === 0) {
		return { module: "general", action: "chat", confidence: 0.5 };
	}

	for (const pattern of INTENT_PATTERNS) {
		if (pattern.regex.test(trimmed)) {
			return {
				module: pattern.module,
				action: pattern.action,
				confidence: pattern.confidence,
			};
		}
	}

	return { module: "general", action: "chat", confidence: 0.5 };
}
