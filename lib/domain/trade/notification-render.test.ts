import { describe, expect, it } from "vitest";
import {
  buildNotificationIdempotencyKey,
  renderNotificationTemplate,
} from "@/lib/domain/trade/notification-render";

describe("buildNotificationIdempotencyKey", () => {
  it("normalizes email and includes event + entity", () => {
    const key = buildNotificationIdempotencyKey({
      eventKey: "order.submitted",
      entityId: "ord-1",
      recipientEmail: "Ops@Example.com",
    });
    expect(key).toBe("order.submitted:ord-1:ops@example.com:v1");
  });
});

describe("renderNotificationTemplate", () => {
  it("substitutes placeholders", () => {
    const out = renderNotificationTemplate(
      "Order {{orderNumber}} for {{customerName}}",
      { orderNumber: "HS-001", customerName: "Acme" },
    );
    expect(out).toBe("Order HS-001 for Acme");
  });
});
