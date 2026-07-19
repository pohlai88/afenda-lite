import type { UIMessage } from "ai";

import type { UiMessage } from "./schemas";

/**
 * After `chatRequestSchema` parse — wire messages are AI SDK UIMessage-compatible.
 * Single boundary convert; engine trusts UIMessage thereafter.
 */
export function toAiSdkUiMessages(messages: readonly UiMessage[]): UIMessage[] {
	return messages as UIMessage[];
}
