import { describe, expect, it } from "vitest";
import {
  TRADE_NATIVE_FIELD_CLASS,
  TRADE_NATIVE_SELECT_CLASS,
  TRADE_NATIVE_TEXTAREA_CLASS,
} from "@/features/trade/trade-form-controls";

describe("trade-form-controls (P2-AC-05)", () => {
  it("exposes Input-parity classes for native FormData fields", () => {
    expect(TRADE_NATIVE_FIELD_CLASS).toContain("h-9");
    expect(TRADE_NATIVE_FIELD_CLASS).toContain("border-input");
    expect(TRADE_NATIVE_FIELD_CLASS).toContain("shadow-xs");
    expect(TRADE_NATIVE_FIELD_CLASS).toContain("focus-visible:ring-3");
    expect(TRADE_NATIVE_SELECT_CLASS).toContain("h-9");
    expect(TRADE_NATIVE_TEXTAREA_CLASS).toContain("min-h-16");
  });
});
