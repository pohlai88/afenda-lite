import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTAL_SEAL_COPY,
  DEFAULT_PORTAL_SEAL_TEXT,
  formatPortalSealCopy,
  resolvePortalSealText,
  type PortalSealCopy,
} from "./portal-seal.contract";
import { DEFAULT_PORTAL_EDITORIAL_COPY } from "./portal-editorial.contract";

describe("portal seal contract", () => {
  it("exports stable default institutional seal copy", () => {
    const copy = DEFAULT_PORTAL_SEAL_COPY satisfies PortalSealCopy;

    expect(copy).toEqual({
      secure: "SECURE",
      confidential: "CONFIDENTIAL",
      verified: "VERIFIED",
    });
  });

  it("formats the seal copy using the canonical separator", () => {
    expect(formatPortalSealCopy(DEFAULT_PORTAL_SEAL_COPY)).toBe(
      DEFAULT_PORTAL_SEAL_TEXT,
    );
  });

  it("supports custom structured copy without changing component logic", () => {
    const copy = {
      secure: "SECURE",
      confidential: "PRIVATE",
      verified: "VERIFIED",
    } satisfies PortalSealCopy;

    expect(formatPortalSealCopy(copy)).toBe("SECURE · PRIVATE · VERIFIED");
  });

  it("resolves editorial default seal from structured default when omitted", () => {
    expect(resolvePortalSealText(DEFAULT_PORTAL_EDITORIAL_COPY)).toBe(
      DEFAULT_PORTAL_SEAL_TEXT,
    );
  });

  it("resolves custom editorial seal text", () => {
    expect(
      resolvePortalSealText({
        ...DEFAULT_PORTAL_EDITORIAL_COPY,
        seal: "CUSTOM SEAL",
      }),
    ).toBe("CUSTOM SEAL");
  });

  it("falls back when editorial seal is omitted", () => {
    expect(
      resolvePortalSealText({ ...DEFAULT_PORTAL_EDITORIAL_COPY, seal: undefined }),
    ).toBe(DEFAULT_PORTAL_SEAL_TEXT);
  });
});
