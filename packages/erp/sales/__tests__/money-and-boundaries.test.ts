import { describe, expect, it } from "vitest";
import {
	addDecimals,
	createSalesOrderInputSchema,
	decimalToScaled,
	multiplyDecimal,
	scaledToDecimal,
} from "../src";
import { ACTOR_USER_ID, ORGANIZATION_ID, PARTY_ID } from "./helpers/harness";

describe("Sales money and boundary contracts", () => {
	it("performs deterministic fixed-scale decimal arithmetic", () => {
		expect(decimalToScaled("12.345678")).toEqual({ ok: true, data: 12345678n });
		expect(scaledToDecimal(12345678n)).toBe("12.345678");
		expect(multiplyDecimal("3", "19.995")).toEqual({
			ok: true,
			data: "59.985",
		});
		expect(addDecimals(["59.985", "-9.985", "5"])).toEqual({
			ok: true,
			data: "55",
		});
	});

	it("rejects unvalidated or incomplete mutation context", () => {
		const parsed = createSalesOrderInputSchema.safeParse({
			organizationId: ORGANIZATION_ID,
			actorUserId: ACTOR_USER_ID,
			partyId: PARTY_ID,
			code: "SO-001",
			currencyCode: "USD",
		});
		expect(parsed.success).toBe(false);
	});
});
