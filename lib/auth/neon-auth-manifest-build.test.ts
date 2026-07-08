import { describe, expect, it } from "vitest";
import { resolveAllowLocalhost } from "../../scripts/lib/neon-auth-manifest-build.mjs";

describe("resolveAllowLocalhost", () => {
  it("uses Neon status when allow_localhost is explicit", () => {
    expect(
      resolveAllowLocalhost({ allow_localhost: false }, [
        { domain: "http://localhost:3000" },
      ]),
    ).toBe(false);
  });

  it("infers false when localhost is not a trusted domain", () => {
    expect(
      resolveAllowLocalhost({}, [{ domain: "https://iam-check.vercel.app" }]),
    ).toBe(false);
  });

  it("infers true when localhost is a trusted domain", () => {
    expect(
      resolveAllowLocalhost({}, [
        { domain: "https://iam-check.vercel.app" },
        { domain: "http://localhost:3000" },
      ]),
    ).toBe(true);
  });
});
