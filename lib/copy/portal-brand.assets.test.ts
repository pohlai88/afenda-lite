import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRAND_COMP_OWL_DARK_PATH,
  BRAND_COMP_OWL_LIGHT_PATH,
  BRAND_DUAL_GUARDIAN_OWL_DARK_PATH,
  BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH,
  BRAND_SHARP_OWL_DARK_PATH,
  BRAND_SHARP_OWL_GUARDIAN_PATH,
  BRAND_SHARP_OWL_LIGHT_PATH,
  BRAND_SHARP_OWL_REFERENCE_PATH,
  FADE_OWL_ASSET_MANIFEST,
  FADE_OWL_GUARDIAN_OWL_PATH,
  GUARDIAN_AUTH_ASSET_SET,
  GUARDIAN_DRAMATIC_OWL_CORE_PATH,
} from "./portal-brand";

const publicRoot = join(process.cwd(), "public");

function publicPath(urlPath: string): string {
  return join(publicRoot, urlPath.replace(/^\//, ""));
}

describe("portal brand sharp owl assets", () => {
  it("has comp source and extracted sharp owl PNGs on disk", () => {
    for (const urlPath of [
      BRAND_SHARP_OWL_REFERENCE_PATH,
      BRAND_SHARP_OWL_DARK_PATH,
      BRAND_SHARP_OWL_LIGHT_PATH,
      BRAND_SHARP_OWL_GUARDIAN_PATH,
    ]) {
      expect(existsSync(publicPath(urlPath)), urlPath).toBe(true);
    }
  });
});

describe("portal brand comp-laptop owl base units", () => {
  it("has removebg owl variant PNGs on disk", () => {
    for (const urlPath of [BRAND_COMP_OWL_DARK_PATH, BRAND_COMP_OWL_LIGHT_PATH]) {
      expect(existsSync(publicPath(urlPath)), urlPath).toBe(true);
    }
  });
});

describe("portal brand fade owl render assets", () => {
  it("has dual light/night guardian PNGs on disk for cross-fade", () => {
    expect(existsSync(publicPath(FADE_OWL_ASSET_MANIFEST.light))).toBe(true);
    expect(existsSync(publicPath(FADE_OWL_ASSET_MANIFEST.night))).toBe(true);
    expect(FADE_OWL_ASSET_MANIFEST.lightStandIn).toBe(FADE_OWL_ASSET_MANIFEST.light);
    expect(FADE_OWL_ASSET_MANIFEST.nightStandIn).toBe(FADE_OWL_ASSET_MANIFEST.night);
    expect(FADE_OWL_ASSET_MANIFEST.light).not.toBe(FADE_OWL_ASSET_MANIFEST.night);
    expect(existsSync(publicPath(FADE_OWL_GUARDIAN_OWL_PATH))).toBe(true);
  });
});

describe("portal brand dual guardian facade owl base units", () => {
  it("has curated allowed-base removebg owl PNGs on disk", () => {
    for (const urlPath of [
      BRAND_DUAL_GUARDIAN_OWL_DARK_PATH,
      BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH,
    ]) {
      expect(existsSync(publicPath(urlPath)), urlPath).toBe(true);
    }
  });
});

describe("guardian auth facade owl cutouts", () => {
  it("uses single dramatic iso for day and night slots (morpho CSS)", () => {
    for (const urlPath of Object.values(GUARDIAN_AUTH_ASSET_SET)) {
      expect(existsSync(publicPath(urlPath)), urlPath).toBe(true);
    }
    expect(GUARDIAN_AUTH_ASSET_SET.owlDay).toBe(GUARDIAN_DRAMATIC_OWL_CORE_PATH);
    expect(GUARDIAN_AUTH_ASSET_SET.owlNight).toBe(GUARDIAN_DRAMATIC_OWL_CORE_PATH);
    expect(GUARDIAN_AUTH_ASSET_SET.owlDay).toBe(GUARDIAN_AUTH_ASSET_SET.owlNight);
  });
});
