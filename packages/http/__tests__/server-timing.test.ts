import { describe, expect, it } from "vitest";

import {
	applyServerTimingHeader,
	SERVER_TIMING_HEADER,
} from "../src/server-timing";
import { stampHttpResponse } from "../src/stamp-response";
import { withHttpContext } from "../src/with-http-context";
import { CORRELATION_HEADER } from "../src/correlation";

describe("@afenda/http Server-Timing", () => {
	it("applyServerTimingHeader writes app;dur=", () => {
		const headers = new Headers();
		applyServerTimingHeader(headers, 1000, { nowMs: 1012.34, metric: "app" });
		expect(headers.get(SERVER_TIMING_HEADER)).toBe("app;dur=12.3");
	});

	it("stampHttpResponse sets correlation and Server-Timing", () => {
		const response = new Response(null, { status: 204 });
		stampHttpResponse(response, {
			correlationId: "11111111-1111-4111-8111-111111111111",
			startTime: Date.now() - 5,
		});
		expect(response.headers.get(CORRELATION_HEADER)).toBe(
			"11111111-1111-4111-8111-111111111111",
		);
		expect(response.headers.get(SERVER_TIMING_HEADER)).toMatch(
			/^app;dur=\d+(\.\d)?$/,
		);
	});

	it("withHttpContext stamps the terminal response", async () => {
		const handler = withHttpContext(async () => new Response("ok"), {
			serverTimingMetric: "health",
		});
		const response = await handler(
			new Request("https://afenda-lite.vercel.app/api/health/liveness"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get(CORRELATION_HEADER)).toMatch(
			/^[0-9a-f-]{36}$/i,
		);
		expect(response.headers.get(SERVER_TIMING_HEADER)).toMatch(
			/^health;dur=\d+(\.\d)?$/,
		);
	});
});
