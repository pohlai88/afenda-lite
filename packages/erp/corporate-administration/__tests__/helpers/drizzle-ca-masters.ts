import { db, mdOrganizationDimension, mdParty } from "@afenda/db";

/** Seeds governed master rows required by ca_legal_company FK constraints. */
export async function ensureDrizzleCaMasterFixtures(input: {
	organizationId: string;
	dimensionId: string;
	dimensionKey: string;
	dimensionName: string;
	partyId?: string;
	partyCode?: string;
}): Promise<void> {
	const normalizedKey = input.dimensionKey.trim().toUpperCase();
	await db
		.insert(mdOrganizationDimension)
		.values({
			id: input.dimensionId,
			organizationId: input.organizationId,
			kind: "legal_entity",
			key: input.dimensionKey,
			normalizedKey,
			name: input.dimensionName,
			effectiveFrom: "1900-01-01",
			effectiveTo: null,
			supersedesId: null,
			createdBy: "test-ca",
		})
		.onConflictDoNothing();

	if (input.partyId && input.partyCode) {
		const code = input.partyCode;
		await db
			.insert(mdParty)
			.values({
				id: input.partyId,
				organizationId: input.organizationId,
				code,
				normalizedCode: code.toLowerCase(),
				name: `Party ${code}`,
				partyKind: "organization",
				status: "active",
				createdBy: "test-ca",
				updatedBy: "test-ca",
				activatedBy: "test-ca",
				activatedAt: new Date(),
			})
			.onConflictDoNothing();
	}
}
