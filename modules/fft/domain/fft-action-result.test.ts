import { describe, expect, it } from "vitest";
import {
  getFftActionError,
  getTradeActionEventId,
  isTradeActionStringResult,
  toFftActionErrorMessage,
  tradeActionFailure,
  tradeActionOk,
} from "@/modules/fft/domain/fft-action-result";

describe("getFftActionError", () => {
  it("reads error field from action failures", () => {
    expect(getFftActionError({ error: "invalid_input" })).toBe("invalid_input");
    expect(getFftActionError({ ok: false, error: "retry_denied" })).toBe(
      "retry_denied",
    );
    expect(getFftActionError(tradeActionFailure("denied"))).toBe("denied");
  });

  it("returns null for success shapes", () => {
    expect(getFftActionError({ ok: true })).toBeNull();
    expect(getFftActionError(tradeActionOk())).toBeNull();
    expect(getFftActionError({ eventId: "e1" })).toBeNull();
    expect(getFftActionError(null)).toBeNull();
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

describe("toFftActionErrorMessage", () => {
  it("prefers Error message over fallback", () => {
    expect(toFftActionErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("uses fallback for non-Error throws", () => {
    expect(toFftActionErrorMessage("nope", "fallback")).toBe("fallback");
  });
});
