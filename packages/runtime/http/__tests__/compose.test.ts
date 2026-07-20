import { describe, expect, it } from "vitest";

import { compose } from "../src/compose";
import { createHttpContext } from "../src/context";

describe("@afenda/http compose", () => {
	it("runs middleware left-to-right then the terminal handler", async () => {
		const order: string[] = [];
		const handler = compose(
			async (req, ctx, next) => {
				order.push("a-enter");
				const res = await next(req, ctx);
				order.push("a-exit");
				return res;
			},
			async (req, ctx, next) => {
				order.push("b-enter");
				const res = await next(req, ctx);
				order.push("b-exit");
				return res;
			},
			(_req, _ctx) => {
				order.push("handler");
				return new Response("ok");
			},
		);

		const request = new Request("http://local.test/api");
		const ctx = createHttpContext(request);
		const response = await handler(request, ctx);

		expect(await response.text()).toBe("ok");
		expect(order).toEqual([
			"a-enter",
			"b-enter",
			"handler",
			"b-exit",
			"a-exit",
		]);
	});

	it("propagates correlation from createHttpContext", async () => {
		const inbound = "11111111-1111-4111-8111-111111111111";
		const request = new Request("http://local.test/api", {
			headers: { "x-correlation-id": inbound },
		});
		const ctx = createHttpContext(request);
		expect(ctx.correlationId).toBe(inbound);

		const handler = compose((_req, c) => new Response(c.correlationId));
		const response = await handler(request, ctx);
		expect(await response.text()).toBe(inbound);
	});
});
