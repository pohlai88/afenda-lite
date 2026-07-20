/** Default AI Gateway model id (provider/model). */
export const DEFAULT_MACHINE_MODEL_ID = "anthropic/claude-sonnet-4.5" as const;

export const DEFAULT_MAX_OUTPUT_TOKENS = 4096 as const;

export const DEFAULT_TEMPERATURE = 0.3 as const;

/** Max characters accepted for a single user text part at the wire boundary. */
export const MAX_CHAT_MESSAGE_CHARS = 8_000 as const;

/** Soft history cap before truncation for prompt context estimates. */
export const MAX_HISTORY_MESSAGES = 40 as const;

export const MACHINE_MODULES = ["platform", "identity", "general"] as const;
