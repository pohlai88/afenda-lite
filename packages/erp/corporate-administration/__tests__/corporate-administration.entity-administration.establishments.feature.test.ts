import { describe, expect, it } from "vitest";
import { EstablishmentsFeature } from "../src/features/entity-administration/establishments";
import { EntityAdministrationFeatureGroup } from "../src/features/entity-administration/group.definition";

describe("@afenda/corporate-administration entity-administration/establishments feature scaffold", () => {
	it("declares the feature id", () => {
		expect(EstablishmentsFeature.id).toBe("establishments");
	});

	it("is a member of its feature group", () => {
		expect(EntityAdministrationFeatureGroup.features).toContain(
			"establishments",
		);
	});
});
