import { describe, expect, it } from "vitest";
import { SALES_EVENT_IDS, SalesEventSchemas } from "../src/schemas/index";

function entityType(eventType: string) {
	if (eventType.startsWith("sales.price_book.entry_"))
		return "sales_price_book_entry";
	if (eventType.startsWith("sales.price_book.")) return "sales_price_book";
	if (eventType.startsWith("sales.quotation.line_"))
		return "sales_quotation_line";
	if (eventType.startsWith("sales.quotation.")) return "sales_quotation";
	if (eventType.startsWith("sales.order.line_")) return "sales_order_line";
	if (eventType.startsWith("sales.order.hold_")) return "sales_order_hold";
	if (eventType.startsWith("sales.order.")) return "sales_order";
	if (eventType.startsWith("sales.return.line_"))
		return "sales_return_authorization_line";
	return "sales_return_authorization";
}

describe("sales event contracts", () => {
	it("registers and validates every versioned Sales event", () => {
		expect(SALES_EVENT_IDS).toHaveLength(33);
		for (const eventType of SALES_EVENT_IDS) {
			const parsed = SalesEventSchemas[eventType].safeParse({
				organizationId: "org-1",
				entityType: entityType(eventType),
				entityId: "11111111-1111-4111-8111-111111111111",
				code: "SALES-001",
				version: 1,
				actorId: "user-1",
				correlationId: "correlation-1",
			});
			expect(parsed.success, eventType).toBe(true);
		}
	});
});
