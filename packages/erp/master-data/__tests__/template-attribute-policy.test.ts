import { describe, expect, it } from "vitest";

import {
	legacyValueKindFromDataType,
	parseTemplateAttributeValidationRules,
} from "../src/capabilities/extensions/template-attribute-policy";
import { normalizeVariantAttributeValue } from "../src/capabilities/extensions/variant-attribute-value-policy";

type ValidationIssue = {
	path: string;
	message: string;
};

function issuePaths(result: { ok: false; details?: unknown }): string[] {
	const details = result.details as { issues?: readonly ValidationIssue[] };
	return (details.issues ?? []).map((issue) => issue.path);
}

describe("template attribute validation policy", () => {
	it("keeps text rules strict and reports actionable paths", () => {
		const zeroLength = parseTemplateAttributeValidationRules("text", {
			minLength: 0,
			maxLength: 0,
		});
		expect(zeroLength.ok).toBe(true);

		const invalidRange = parseTemplateAttributeValidationRules("text", {
			minLength: 10,
			maxLength: 2,
		});
		expect(invalidRange.ok).toBe(false);
		if (!invalidRange.ok) {
			expect(issuePaths(invalidRange)).toContain("validationRules.maxLength");
		}

		const invalidPattern = parseTemplateAttributeValidationRules("text", {
			pattern: "[",
		});
		expect(invalidPattern.ok).toBe(false);
		if (!invalidPattern.ok) {
			expect(issuePaths(invalidPattern)).toContain("validationRules.pattern");
		}

		const typo = parseTemplateAttributeValidationRules("text", {
			maxLenght: 10,
		});
		expect(typo.ok).toBe(false);
	});

	it("separates integer rules from decimal rules", () => {
		expect(
			parseTemplateAttributeValidationRules("integer", {
				minimum: 1.5,
			}).ok,
		).toBe(false);
		expect(
			parseTemplateAttributeValidationRules("integer", {
				scale: 2,
			}).ok,
		).toBe(false);

		const validInteger = parseTemplateAttributeValidationRules("integer", {
			minimum: -10,
			maximum: 10,
			precision: 2,
		});
		expect(validInteger.ok).toBe(true);
	});

	it("validates decimal rules as canonical strings without number rounding", () => {
		const highPrecision = "99999999999999999999999999999999999999";
		const parsed = parseTemplateAttributeValidationRules("decimal", {
			minimum: highPrecision,
			maximum: highPrecision,
			precision: 38,
			scale: 0,
		});
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.data.minimum).toBe(highPrecision);
		}

		expect(
			parseTemplateAttributeValidationRules("decimal", {
				minimum: 1,
			}).ok,
		).toBe(false);

		const badScale = parseTemplateAttributeValidationRules("decimal", {
			precision: 2,
			scale: 3,
		});
		expect(badScale.ok).toBe(false);
		if (!badScale.ok) {
			expect(issuePaths(badScale)).toContain("validationRules.scale");
		}

		const badBound = parseTemplateAttributeValidationRules("decimal", {
			minimum: "1234.567",
			precision: 5,
			scale: 2,
		});
		expect(badBound.ok).toBe(false);
		if (!badBound.ok) {
			expect(issuePaths(badBound)).toContain("validationRules.minimum");
		}
	});

	it("enforces decimal string bounds during variant value normalization", () => {
		const rules = parseTemplateAttributeValidationRules("decimal", {
			minimum: "99999999999999999999999999999999999998",
			maximum: "99999999999999999999999999999999999999",
			precision: 38,
			scale: 0,
		});
		expect(rules.ok).toBe(true);
		if (!rules.ok) return;

		expect(
			normalizeVariantAttributeValue({
				dataType: "decimal",
				validationRules: rules.data,
				value: { decimalValue: "99999999999999999999999999999999999999" },
			}).ok,
		).toBe(true);
		expect(
			normalizeVariantAttributeValue({
				dataType: "decimal",
				validationRules: rules.data,
				value: { decimalValue: "99999999999999999999999999999999999997" },
			}).ok,
		).toBe(false);
	});

	it("uses explicit paths for date and governed reference validation", () => {
		const dateRange = parseTemplateAttributeValidationRules("date", {
			minimum: "2026-12-31",
			maximum: "2026-01-01",
		});
		expect(dateRange.ok).toBe(false);
		if (!dateRange.ok) {
			expect(issuePaths(dateRange)).toContain("validationRules.maximum");
		}

		expect(
			parseTemplateAttributeValidationRules("reference", {
				referenceType: "Customer Record",
			}).ok,
		).toBe(false);
		expect(
			parseTemplateAttributeValidationRules("reference", {
				referenceType: "ITEM",
			}),
		).toMatchObject({ ok: true, data: { referenceType: "item" } });
	});

	it("documents legacy value-kind projection as lossy", () => {
		expect(legacyValueKindFromDataType("single_option")).toBe("option");
		expect(legacyValueKindFromDataType("multiple_option")).toBe("option");
		expect(legacyValueKindFromDataType("decimal")).toBe("text");
		expect(legacyValueKindFromDataType("reference")).toBe("text");
	});
});
