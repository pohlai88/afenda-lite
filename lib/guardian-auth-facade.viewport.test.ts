import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCssContract } from "@/testing/css-contract";

const cssDir = join(process.cwd(), "components", "auth");

describe("guardian auth facade viewport lock", () => {
  const css = readCssContract(cssDir, "guardian-auth-facade.css");

  it("locks desktop canvas to one viewport", () => {
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain("grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.56fr)");
  });

  it("compresses card and headline on short laptop heights", () => {
    expect(css).toContain("@media (max-height: 760px) and (min-width: 981px)");
    expect(css).toContain(".owl-scene");
    expect(css).toContain("contain: layout paint");
  });

  it("allows mobile scroll while desktop stays locked", () => {
    expect(css).toContain("@media (max-width: 980px)");
    expect(css).toMatch(/@media \(max-width: 980px\)[\s\S]*overflow-y: auto/);
  });
});
