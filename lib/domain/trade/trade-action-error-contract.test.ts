import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getTradeActionError } from "@/lib/domain/trade/trade-action-result";
import { parseTradeLocale } from "@/lib/schemas/trade";

const REPO_ROOT = join(import.meta.dirname, "../../..");

describe("trade action error contract", () => {
  it("maps invalid locale through Zod to a stable error token", () => {
    const parsed = parseTradeLocale("de");
    expect(parsed.success).toBe(false);
    expect(getTradeActionError({ error: "invalid_locale" })).toBe(
      "invalid_locale",
    );
  });

  it("accepts valid trade locales used by actions", () => {
    expect(parseTradeLocale("vi").success).toBe(true);
    expect(parseTradeLocale("en").success).toBe(true);
  });

  it("keeps trade.ts free of throw new Error for locale/not_found gates", () => {
    const source = readFileSync(join(REPO_ROOT, "app/actions/trade.ts"), "utf8");
    expect(source).not.toMatch(/throw new Error\("invalid_locale"\)/);
    expect(source).not.toMatch(/throw new Error\("not_found"\)/);
    expect(source).toContain("gateTradeLocale");
    expect(source).toContain('return { error: "invalid_locale"');
  });
});
