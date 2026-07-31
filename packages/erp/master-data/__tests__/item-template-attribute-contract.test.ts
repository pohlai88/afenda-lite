import { describe, expect, it } from "vitest";

import {
	addItemTemplateAttributeInputSchema,
	addItemTemplateAttributeOptionInputSchema,
	createItemVariantAttributeValueInputSchema,
} from "../src/capabilities/core-organization-masters/schemas";

const mutationContext = {
	organizationId: "org-a",
	actorUserId: "user-a",
	correlationId: "00000000-0000-4000-8000-000000000001",
};

describe("item-template attribute semantic contract", () => {
	it("normalizes historical attribute names at ingress without retaining them", () => {
		const parsed = addItemTemplateAttributeInputSchema.parse({
			...mutationContext,
			templateId: "10000000-0000-4000-8000-000000000001",
			code: "COLOR",
			name: "Color",
			valueKind: "option",
			sortOrder: 7,
		});

		expect(parsed).toMatchObject({
			dataType: "single_option",
			displayOrder: 7,
		});
		expect(parsed).not.toHaveProperty("valueKind");
		expect(parsed).not.toHaveProperty("sortOrder");
	});

	it("normalizes historical option and value names without outward aliases", () => {
		const option = addItemTemplateAttributeOptionInputSchema.parse({
			...mutationContext,
			attributeId: "20000000-0000-4000-8000-000000000001",
			code: "RED",
			label: "Red",
			sortOrder: 3,
		});
		const value = createItemVariantAttributeValueInputSchema.parse({
			attributeId: "20000000-0000-4000-8000-000000000001",
			valueText: "Red",
		});

		expect(option).toMatchObject({ displayOrder: 3 });
		expect(option).not.toHaveProperty("sortOrder");
		expect(value).toMatchObject({ textValue: "Red" });
		expect(value).not.toHaveProperty("valueText");
	});

	it("rejects conflicting canonical and historical representations", () => {
		expect(() =>
			addItemTemplateAttributeInputSchema.parse({
				...mutationContext,
				templateId: "10000000-0000-4000-8000-000000000001",
				code: "COLOR",
				name: "Color",
				dataType: "text",
				valueKind: "option",
			}),
		).toThrow();
	});
});
