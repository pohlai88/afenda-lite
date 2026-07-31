import {
	type ConversationContext,
	chatRequestSchema,
	classifyIntent,
	type MachineModule,
} from "@afenda/ai-the-machine";
import { getApiSession } from "@afenda/auth";
import { errorResult } from "@afenda/errors";
import { applyRateLimitHeaders } from "@afenda/http";
import { checkRateLimit, toRateLimitFailure } from "@afenda/rate-limit";
import {
	canReachAiGateway,
	createWebTheMachine,
} from "@/modules/platform/ai/create-web-machine";
import { jsonFailure } from "@/modules/platform/api/json-response";
import { createPlatformRouteHandler } from "@/modules/platform/api/route-pipeline";

export const maxDuration = 30;

const AI_CHAT_ROUTE_TEMPLATE = "/api/ai/chat" as const;

function lastUserText(
	messages: readonly { role: string; parts: unknown[] }[],
): string {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		if (message === undefined || message.role !== "user") {
			continue;
		}
		for (const part of message.parts) {
			if (
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				part.type === "text" &&
				"text" in part &&
				typeof part.text === "string"
			) {
				return part.text;
			}
		}
	}
	return "";
}

function resolveModule(
	explicit: MachineModule | undefined,
	messages: Parameters<typeof lastUserText>[0],
): MachineModule {
	if (explicit !== undefined) {
		return explicit;
	}
	return classifyIntent(lastUserText(messages)).module;
}

/**
 * POST /api/ai/chat — authenticated UIMessage stream (The Machine).
 * Session mints org/user; client must not send tenant ids.
 */
export const POST = createPlatformRouteHandler(
	async (request) => {
		const session = await getApiSession();
		if (session === null) {
			return jsonFailure(errorResult.fail("UNAUTHORIZED"));
		}

		const limit = await checkRateLimit({
			bucket: "ai_chat",
			key: session.userId,
		});
		if (!limit.ok) {
			const error = toRateLimitFailure(limit);
			const response = jsonFailure(error);
			if (limit.reason === "rate_limited") {
				applyRateLimitHeaders(response.headers, {
					limit: limit.quota.limit,
					remaining: limit.quota.remaining,
					resetEpochMs: limit.quota.resetEpochMs,
				});
			}
			return response;
		}

		if (!canReachAiGateway()) {
			return jsonFailure(errorResult.fail("SERVICE_UNAVAILABLE"));
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return jsonFailure(
				errorResult.fail("BAD_REQUEST", {
					publicMessage: "Invalid JSON body",
				}),
			);
		}

		const parsed = chatRequestSchema.safeParse(body);
		if (!parsed.success) {
			return jsonFailure(
				errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid chat request",
				}),
			);
		}

		const module = resolveModule(parsed.data.module, parsed.data.messages);
		const context: ConversationContext = {
			conversationId: crypto.randomUUID(),
			userId: session.userId,
			organizationId: session.orgId,
			module,
			language: "en",
		};

		const machine = createWebTheMachine();
		const response = await machine.stream({
			messages: parsed.data.messages,
			context,
		});

		applyRateLimitHeaders(response.headers, {
			limit: limit.quota.limit,
			remaining: limit.quota.remaining,
			resetEpochMs: limit.quota.resetEpochMs,
		});
		return response;
	},
	{
		serverTimingMetric: "ai_chat",
		routeTemplate: AI_CHAT_ROUTE_TEMPLATE,
	},
);
