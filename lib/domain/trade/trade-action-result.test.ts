import { describe, expect, it } from "vitest";
import {
  getTradeActionError,
  getTradeActionEventId,
  isTradeActionStringResult,
  toTradeActionErrorMessage,
  tradeActionFailure,
  tradeActionOk,
} from "@/lib/domain/trade/trade-action-result";

describe("getTradeActionError", () => {
  it("reads error field from action failures", () => {
    expect(getTradeActionError({ error: "invalid_input" })).toBe("invalid_input");
    expect(getTradeActionError({ ok: false, error: "retry_denied" })).toBe(
      "retry_denied",
    );
    expect(getTradeActionError(tradeActionFailure("denied"))).toBe("denied");
  });

  it("returns null for success shapes", () => {
    expect(getTradeActionError({ ok: true })).toBeNull();
    expect(getTradeActionError(tradeActionOk())).toBeNull();
    expect(getTradeActionError({ eventId: "e1" })).toBeNull();
    expect(getTradeActionError(null)).toBeNull();
  });
});

describe("getTradeActionEventId", () => {
  it("returns eventId from success payloads", () => {
    expect(getTradeActionEventId({ eventId: "evt_1" })).toBe("evt_1");
  });

  it("returns null for failures and empty ids", () => {
    expect(getTradeActionEventId({ error: "invalid_locale" })).toBeNull();
    expect(getTradeActionEventId({ eventId: "" })).toBeNull();
    expect(getTradeActionEventId(null)).toBeNull();
  });
});

describe("isTradeActionStringResult", () => {
  it("narrows CSV string payloads", () => {
    expect(isTradeActionStringResult("a,b\n1,2")).toBe(true);
    expect(isTradeActionStringResult({ error: "invalid_locale" })).toBe(false);
    expect(isTradeActionStringResult(null)).toBe(false);
  });
});

describe("toTradeActionErrorMessage", () => {
  it("prefers Error message over fallback", () => {
    expect(toTradeActionErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses fallback for non-Error throws", () => {
    expect(toTradeActionErrorMessage("nope", "fallback")).toBe("fallback");
  });
});
