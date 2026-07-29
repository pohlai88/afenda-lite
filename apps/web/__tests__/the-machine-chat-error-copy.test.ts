import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const chatSource = readFileSync(
	path.join(webRoot, "features/ai-the-machine/the-machine-chat.tsx"),
	"utf8",
);

describe("TheMachineChat error copy", () => {
	it("renders fixed public-safe copy instead of the raw SDK error message", () => {
		expect(chatSource).toContain(
			"The assistant could not complete the request. Please try again.",
		);
		expect(chatSource).toContain("{AI_CHAT_ERROR_MESSAGE}");
		expect(chatSource).not.toContain("{error.message}");
	});
});
