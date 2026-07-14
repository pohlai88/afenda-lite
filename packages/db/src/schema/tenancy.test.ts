import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { surveys } from "./declarations";
import { fftEvent } from "./fft";
import { platformRole } from "./platform";

describe("@afenda/db tenant columns", () => {
	it("keeps organization_id on living tenant roots", () => {
		expect(getTableColumns(surveys).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(fftEvent).organizationId.name).toBe(
			"organization_id",
		);
	});

	it("exposes organization_id on platform_role", () => {
		expect(getTableColumns(platformRole).organizationId.name).toBe(
			"organization_id",
		);
	});
});
