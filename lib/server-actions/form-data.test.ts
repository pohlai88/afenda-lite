import { describe, expect, it } from "vitest";
import {
  formBooleanLiteral,
  formNumberField,
  formPassword,
  formString,
  formStringDefault,
  formStringList,
} from "@/lib/server-actions/form-data";

describe("formString", () => {
  it("trims string fields and defaults missing keys to empty string", () => {
    const formData = new FormData();
    formData.set("title", "  Declaration  ");

    expect(formString(formData, "title")).toBe("Declaration");
    expect(formString(formData, "missing")).toBe("");
  });
});

describe("formStringDefault", () => {
  it("returns fallback when the field is missing or blank", () => {
    const formData = new FormData();
    formData.set("present", "   ");
    formData.set("value", " kept ");

    expect(formStringDefault(formData, "missing", "[]")).toBe("[]");
    expect(formStringDefault(formData, "present", "[]")).toBe("[]");
    expect(formStringDefault(formData, "value", "[]")).toBe("kept");
  });
});

describe("formPassword", () => {
  it("does not trim password values", () => {
    const formData = new FormData();
    formData.set("password", "  secret  ");

    expect(formPassword(formData, "password")).toBe("  secret  ");
  });
});

describe("formStringList", () => {
  it("returns trimmed non-empty values for repeated fields", () => {
    const formData = new FormData();
    formData.append("tags", "  one ");
    formData.append("tags", "");
    formData.append("tags", "two");

    expect(formStringList(formData, "tags")).toEqual(["one", "two"]);
  });
});

describe("formBooleanLiteral", () => {
  it("maps checkbox true literals only", () => {
    const checked = new FormData();
    checked.set("identityConsent", "true");

    const unchecked = new FormData();
    unchecked.set("identityConsent", "false");

    expect(formBooleanLiteral(checked, "identityConsent")).toBe("true");
    expect(formBooleanLiteral(unchecked, "identityConsent")).toBe("");
  });
});

describe("formNumberField", () => {
  it("returns raw values for Zod coercion and defaults missing keys to 0", () => {
    const formData = new FormData();
    formData.set("sizeBytes", "2048");

    expect(formNumberField(formData, "sizeBytes")).toBe("2048");
    expect(formNumberField(formData, "missing")).toBe(0);
  });
});
