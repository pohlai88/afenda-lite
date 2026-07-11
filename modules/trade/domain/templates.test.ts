import { describe, expect, it } from "vitest";
import { buildGp2PigletTemplate } from "@/modules/trade/domain/templates";
import { assertEventFieldEditable } from "@/modules/trade/domain/events";

describe("buildGp2PigletTemplate (AC-EVT-05 / G7)", () => {
  it("seeds a draft template event with products and field defs", () => {
    const template = buildGp2PigletTemplate();

    expect(template.event.isTemplate).toBe(true);
    expect(template.event.status).toBe("draft");
    expect(template.event.eventCode).toBe("GP2-PIGLET-TEMPLATE");
    expect(template.event.clonedFromId).toBeNull();

    // 3 batches × 3 weights
    expect(template.products).toHaveLength(9);
    expect(template.products.every((p) => p.unit === "piglet")).toBe(true);
    expect(template.products.every((p) => p.finalConfirmedQuantity === null)).toBe(
      true,
    );

    expect(template.fieldDefs.length).toBeGreaterThanOrEqual(3);
    expect(template.fieldDefs.map((f) => f.fieldKey)).toEqual(
      expect.arrayContaining([
        "priority_status",
        "deposit_status",
        "pickup_schedule",
      ]),
    );
  });

  it("produces an editable draft setup (products + required fields unlocked)", () => {
    const template = buildGp2PigletTemplate();
    const draft = { status: template.event.status! };

    expect(assertEventFieldEditable(draft, "products").allowed).toBe(true);
    expect(assertEventFieldEditable(draft, "requiredCustomFields").allowed).toBe(
      true,
    );
    expect(assertEventFieldEditable(draft, "opensAt").allowed).toBe(true);
  });
});
