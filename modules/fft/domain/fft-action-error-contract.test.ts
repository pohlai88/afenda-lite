import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getFftActionError } from "@/modules/fft/domain/fft-action-result";
import { parseFftLocale } from "@/modules/fft/schemas/fft-schemas";

const REPO_ROOT = join(import.meta.dirname, "../../..");

describe("trade action error contract", () => {
  it("maps invalid locale through Zod to a stable error token", () => {
    const parsed = parseFftLocale("de");
    expect(parsed.success).toBe(false);
    expect(getFftActionError({ error: "invalid_locale" })).toBe(
      "invalid_locale",
    );
  });

  it("accepts valid trade locales used by actions", () => {
    expect(parseFftLocale("vi").success).toBe(true);
    expect(parseFftLocale("en").success).toBe(true);
  });

  it("keeps trade.ts free of throw new Error for locale/not_found gates", () => {
    const source = readFileSync(join(REPO_ROOT, "app/actions/fft.ts"), "utf8");
    expect(source).not.toMatch(/throw new Error\("invalid_locale"\)/);
    expect(source).not.toMatch(/throw new Error\("not_found"\)/);
    expect(source).toContain("gateFftLocale");
    expect(source).toContain('return { error: "invalid_locale"');
  });
});
