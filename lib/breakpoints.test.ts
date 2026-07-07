import { describe, expect, it } from "vitest";
import {
  BREAKPOINT_MD_PX,
  BREAKPOINT_MD_REM,
  MOBILE_MAX_WIDTH_PX,
  MOBILE_MEDIA_QUERY,
} from "@/lib/breakpoints";

describe("breakpoints", () => {
  it("aligns md breakpoint with Tailwind 48rem / 768px", () => {
    expect(BREAKPOINT_MD_REM).toBe(48);
    expect(BREAKPOINT_MD_PX).toBe(768);
    expect(MOBILE_MAX_WIDTH_PX).toBe(767);
    expect(MOBILE_MEDIA_QUERY).toBe("(max-width: 767px)");
  });
});
