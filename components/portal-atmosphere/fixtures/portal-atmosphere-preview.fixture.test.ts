import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixturePath = join(__dirname, "portal-atmosphere-preview.fixture.tsx");

describe("portal atmosphere preview fixture authority", () => {
  const source = readFileSync(fixturePath, "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("composes production PortalAtmosphere without auth imports", () => {
    expect(code).toContain("PortalAtmosphere");
    expect(code).toContain("PortalAccessSlot");
    expect(code).toContain("AccessSlotPlaceholder");
    expect(code).not.toMatch(/@neondatabase/);
    expect(code).not.toContain("AuthView");
    expect(code).not.toContain("PortalAuthLayout");
    expect(code).not.toContain("app/actions");
  });

  it("keeps owl in layers and composes PA-P8 layout slots on PortalAtmosphere", () => {
    expect(code).toContain("layers={");
    expect(code).toContain("PortalGuardianOwl");
    expect(code).toContain("showOwl={showOwl}");
    expect(code).toContain("brand={");
    expect(code).toContain("accessSlot={");
    expect(code).toContain("PortalEditorialHero");
    expect(code).toContain("PortalSealLine");
    expect(code).not.toContain("portal-atmosphere__layout");
  });

  it("defaults access slot to AccessSlotPlaceholder and exposes split preview", () => {
    expect(code).toContain("DEFAULT_ACCESS_SLOT");
    expect(code).toContain("PortalAtmosphereSplitPreview");
    expect(code).toContain('theme="dark"');
    expect(code).toContain('theme="light"');
  });
});
