import { describe, expect, expectTypeOf, it } from "vitest";

import { database, type PlatformPermissionCode } from "../src";

describe("@afenda/db database capability", () => {
	it("exposes one frozen runtime facade", () => {
		expect(Object.isFrozen(database)).toBe(true);
		expect(Object.isFrozen(database.tenancy)).toBe(true);
		expect(Object.isFrozen(database.permissions)).toBe(true);
		expect(typeof database.transaction).toBe("function");
		expect(typeof database.tenancy.where).toBe("function");
		expect(typeof database.tenancy.entity).toBe("function");
		expect(typeof database.tenancy.readAll).toBe("function");
		expect(typeof database.permissions.ensure).toBe("function");
		expect(typeof database.permissions.isCode).toBe("function");
	});

	it("derives permission codes from the canonical catalog", () => {
		const [firstCode] = database.permissions.codes;
		expect(firstCode).toBeDefined();
		expectTypeOf(firstCode).toMatchTypeOf<PlatformPermissionCode | undefined>();
		expect(database.permissions.codes.every(database.permissions.isCode)).toBe(
			true,
		);
	});

	it("projects the canonical hard-tenant registry", () => {
		expect(database.tenancy.rootNames).toHaveLength(278);
		expect(Object.keys(database.tenancy.rootTables)).toHaveLength(278);
	});
});
