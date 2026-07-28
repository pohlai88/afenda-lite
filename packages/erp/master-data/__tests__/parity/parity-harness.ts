import { randomUUID } from "node:crypto";

import { db, sql as drizzleSql, runNeonHttpTransaction } from "@afenda/db";
import type { Result } from "@afenda/errors/result";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEmptyDependencyInspector } from "../../src/capabilities/core-organization-masters/dependency";
import type { MasterDataStore } from "../../src/capabilities/core-organization-masters/store";
import type { MasterCommandOptions } from "../../src/command-options";
import { createDrizzleMasterDataStore } from "../../src/drizzle-store";
import { MASTER_DATA_PERMISSION_CODES } from "../../src/permissions";
import { createGrantingMasterAuthorization } from "../helpers/memory-authorization";
import {
	createMemoryMasterDataStore,
	seedDefaultPlatformRefs,
} from "../helpers/memory-master-data-store";
import { createMemoryMutationPorts } from "../helpers/memory-ports";

export const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";
export const COUNTRY_ID = "c1000000-0000-4000-8000-000000000001";

export type ParityHarness = {
	store: MasterDataStore;
	options: MasterCommandOptions;
	organizationId: string;
	otherOrganizationId: string;
	actorUserId: string;
	uomId: string;
	countryId: string;
	context(): {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
	};
	queryContext(organizationId?: string): {
		organizationId: string;
		actorUserId: string;
	};
	cleanup(): Promise<void>;
};

export type StoreFactory = () => Promise<ParityHarness>;

export type VersionedPublicRoot = {
	id: string;
	organizationId: string;
	version: number;
};

export type RootParityContract<T extends VersionedPublicRoot> = {
	create(harness: ParityHarness): Promise<Result<T>>;
	get(
		harness: ParityHarness,
		id: string,
		organizationId?: string,
	): Promise<Result<T | null>>;
	update(
		harness: ParityHarness,
		row: T,
		expectedVersion: number,
	): Promise<Result<T>>;
};

function createHarness(
	store: MasterDataStore,
	cleanup: () => Promise<void>,
	platformRefs: { uomId: string; countryId: string },
): ParityHarness {
	const suffix = randomUUID();
	const organizationId = `org-md-parity-${suffix}`;
	const actorUserId = `user-md-parity-${suffix}`;
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingMasterAuthorization([
		...MASTER_DATA_PERMISSION_CODES,
	]);
	const dependencyInspector = createEmptyDependencyInspector();
	return {
		store,
		organizationId,
		otherOrganizationId: `org-md-parity-other-${suffix}`,
		actorUserId,
		uomId: platformRefs.uomId,
		countryId: platformRefs.countryId,
		options: { store, ports, authorization, dependencyInspector },
		context: () => ({
			organizationId,
			actorUserId,
			correlationId: randomUUID(),
		}),
		queryContext: (requestedOrganizationId = organizationId) => ({
			organizationId: requestedOrganizationId,
			actorUserId,
		}),
		cleanup,
	};
}

export async function createMemoryHarness(): Promise<ParityHarness> {
	const store = createMemoryMasterDataStore();
	seedDefaultPlatformRefs(store);
	return createHarness(store, async () => undefined, {
		uomId: EA_UOM_ID,
		countryId: COUNTRY_ID,
	});
}

async function cleanupOrganization(organizationId: string): Promise<void> {
	const optionalTables = await db.execute(drizzleSql`
		SELECT
			to_regclass('public.md_import_batch_row') AS import_row_relation,
			to_regclass('public.md_item_variant_attribute_value_option') AS variant_option_relation
	`);
	const hasImportRowTable = optionalTables.rows.some(
		(row) =>
			typeof row === "object" &&
			row !== null &&
			"import_row_relation" in row &&
			row.import_row_relation !== null,
	);
	const hasVariantOptionTable = optionalTables.rows.some(
		(row) =>
			typeof row === "object" &&
			row !== null &&
			"variant_option_relation" in row &&
			row.variant_option_relation !== null,
	);
	await runNeonHttpTransaction<unknown[]>((sql) => [
		...(hasImportRowTable
			? [
					sql`DELETE FROM md_import_batch_row WHERE organization_id = ${organizationId}`,
				]
			: []),
		...(hasVariantOptionTable
			? [
					sql`DELETE FROM md_item_variant_attribute_value_option WHERE organization_id = ${organizationId}`,
				]
			: []),
		sql`DELETE FROM md_item_variant_attribute_value WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_variant WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_template_attribute_option WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_template_attribute WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_alias WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_barcode WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_external_id WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_uom WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_warehouse_external_id WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party_relationship WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party_contact WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party_address WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party_role WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party_external_id WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_tax_registration WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_change_request WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_template WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_item_group WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_warehouse WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_payment_term WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_party WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_organization_dimension WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM md_import_batch WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM platform_search_document WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM platform_audit_log WHERE organization_id = ${organizationId}`,
		sql`DELETE FROM platform_domain_event WHERE organization_id = ${organizationId}`,
	]);
}

export async function createDrizzleHarness(): Promise<ParityHarness> {
	const refSuffix = randomUUID();
	const uomDimensionId = randomUUID();
	const uomId = randomUUID();
	const countryId = randomUUID();
	await runNeonHttpTransaction<unknown[]>((sql) => [
		sql`INSERT INTO ref_country (id, code, alpha3, name, active)
			VALUES (${countryId}, 'XZ', 'XZZ', ${`Parity Country ${refSuffix}`}, true)`,
		sql`INSERT INTO ref_uom_dimension (id, code, name)
			VALUES (${uomDimensionId}, 'count', ${`Parity Dimension ${refSuffix}`})`,
		sql`INSERT INTO ref_uom (
			id, code, name, symbol, dimension_id,
			to_base_numerator, to_base_denominator, is_base, active
		) VALUES (
			${uomId}, ${`P${refSuffix.replaceAll("-", "").slice(0, 12).toUpperCase()}`}, ${`Parity UoM ${refSuffix}`}, 'P',
			${uomDimensionId}, 1, 1, true, true
		)`,
	]);
	let organizationId = "";
	const harness = createHarness(
		createDrizzleMasterDataStore(),
		async () => {
			await cleanupOrganization(organizationId);
			await runNeonHttpTransaction<unknown[]>((sql) => [
				sql`DELETE FROM ref_uom WHERE id = ${uomId}`,
				sql`DELETE FROM ref_uom_dimension WHERE id = ${uomDimensionId}`,
				sql`DELETE FROM ref_country WHERE id = ${countryId}`,
			]);
		},
		{ uomId, countryId },
	);
	organizationId = harness.organizationId;
	return harness;
}

export function defineRootParityTests<T extends VersionedPublicRoot>(
	name: string,
	createStore: StoreFactory,
	contract: RootParityContract<T>,
): void {
	describe(name, () => {
		let harness: ParityHarness;

		beforeEach(async () => {
			harness = await createStore();
		});

		afterEach(async () => {
			await harness.cleanup();
		});

		it("returns the same tenant-safe public miss", async () => {
			const created = await contract.create(harness);
			expect(created.ok, JSON.stringify(created)).toBe(true);
			if (!created.ok) return;

			const result = await contract.get(
				harness,
				created.data.id,
				harness.otherOrganizationId,
			);
			expect(result).toEqual({ ok: true, data: null });
		});

		it("returns the same stale-version code and public projection", async () => {
			const created = await contract.create(harness);
			expect(created.ok, JSON.stringify(created)).toBe(true);
			if (!created.ok) return;

			const updated = await contract.update(
				harness,
				created.data,
				created.data.version,
			);
			expect(updated.ok, JSON.stringify(updated)).toBe(true);
			if (!updated.ok) return;
			expect(updated.data).toMatchObject({
				id: created.data.id,
				organizationId: harness.organizationId,
				version: created.data.version + 1,
			});

			const stale = await contract.update(
				harness,
				updated.data,
				created.data.version,
			);
			expect(stale.ok).toBe(false);
			if (stale.ok) return;
			expect(stale.code).toBe("CONFLICT");
			expect(stale.details).toMatchObject({
				reason: "MASTER_VERSION_CONFLICT",
			});
		});
	});
}
