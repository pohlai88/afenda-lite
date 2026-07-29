import { db, sql } from "@afenda/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	addSalesOrderLine,
	approveSalesOrder,
	createDraftSalesOrder,
	getSalesOrderById,
	postSalesOrder,
	submitSalesOrder,
} from "../src";
import { createDrizzleSalesStore } from "../src/adapters/drizzle";
import { allowAllSalesAuthorization } from "../src/testing";
import {
	ACTOR_USER_ID,
	masterData,
	mutationContext,
	ORGANIZATION_ID,
	OTHER_ORGANIZATION_ID,
	PARTY_ID,
} from "./helpers/harness";

const runIntegration = process.env.SALES_NEON_INTEGRATION === "1";
const ITEM_GROUP_ID = "77777777-7777-4777-8777-777777777777";
const ITEM_ID = "55555555-5555-4555-8555-555555555555";
const UOM_DIMENSION_ID = "88888888-8888-4888-8888-888888888888";
const UOM_ID = "66666666-6666-4666-8666-666666666666";

describe.runIf(runIntegration)(
	"Sales Drizzle temporary-Neon integration",
	() => {
		beforeAll(async () => {
			for (const statement of [
				sql`INSERT INTO ref_uom_dimension (id, code, name)
			VALUES (${UOM_DIMENSION_ID}::uuid, 'sales_it_count', 'Sales integration count')
			ON CONFLICT (id) DO NOTHING`,
				sql`INSERT INTO ref_uom (id, code, name, symbol, dimension_id, to_base_numerator, to_base_denominator, is_base, active)
			VALUES (${UOM_ID}::uuid, 'sales_it_each', 'Sales integration each', 'ea', ${UOM_DIMENSION_ID}::uuid, 1, 1, true, true)
			ON CONFLICT (id) DO NOTHING`,
				sql`INSERT INTO md_party (id, organization_id, code, normalized_code, name, party_kind, status, created_by, updated_by)
			VALUES (${PARTY_ID}::uuid, ${ORGANIZATION_ID}, 'SALES-IT-CUSTOMER', 'SALES-IT-CUSTOMER', 'Sales Integration Customer', 'organization', 'active', ${ACTOR_USER_ID}, ${ACTOR_USER_ID})`,
				sql`INSERT INTO md_item_group (id, organization_id, code, normalized_code, name, status, created_by, updated_by)
			VALUES (${ITEM_GROUP_ID}::uuid, ${ORGANIZATION_ID}, 'SALES-IT-GROUP', 'SALES-IT-GROUP', 'Sales Integration Group', 'active', ${ACTOR_USER_ID}, ${ACTOR_USER_ID})`,
				sql`INSERT INTO md_item (id, organization_id, code, normalized_code, name, item_type, status, base_uom_id, item_group_id, created_by, updated_by)
			VALUES (${ITEM_ID}::uuid, ${ORGANIZATION_ID}, 'SALES-IT-ITEM', 'SALES-IT-ITEM', 'Sales Integration Item', 'stock', 'active', ${UOM_ID}::uuid, ${ITEM_GROUP_ID}::uuid, ${ACTOR_USER_ID}, ${ACTOR_USER_ID})`,
			]) {
				// biome-ignore lint/performance/noAwaitInLoops: Fixture statements must execute in dependency order.
				await db.execute(statement);
			}
		});

		afterAll(async () => {
			for (const statement of [
				sql`DELETE FROM platform_domain_event WHERE organization_id = ${ORGANIZATION_ID} AND correlation_id LIKE 'test:drizzle-%'`,
				sql`DELETE FROM platform_audit_log WHERE organization_id = ${ORGANIZATION_ID} AND correlation_id LIKE 'test:drizzle-%'`,
				sql`DELETE FROM sales_order_schedule WHERE organization_id = ${ORGANIZATION_ID}`,
				sql`DELETE FROM sales_order_line WHERE organization_id = ${ORGANIZATION_ID}`,
				sql`DELETE FROM sales_order WHERE organization_id = ${ORGANIZATION_ID}`,
				sql`DELETE FROM md_item WHERE id = ${ITEM_ID}::uuid`,
				sql`DELETE FROM md_item_group WHERE id = ${ITEM_GROUP_ID}::uuid`,
				sql`DELETE FROM md_party WHERE id = ${PARTY_ID}::uuid`,
				sql`DELETE FROM ref_uom WHERE id = ${UOM_ID}::uuid`,
				sql`DELETE FROM ref_uom_dimension WHERE id = ${UOM_DIMENSION_ID}::uuid`,
			]) {
				// biome-ignore lint/performance/noAwaitInLoops: Cleanup reverses fixture dependencies deterministically.
				await db.execute(statement);
			}
		});

		it("persists state, audit and outbox atomically with tenant isolation", async () => {
			const store = createDrizzleSalesStore();
			const options = {
				store,
				authorization: allowAllSalesAuthorization(),
				masterData,
				clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
			};
			const created = await createDraftSalesOrder(
				{
					...mutationContext("drizzle-create"),
					code: "SO-DRIZZLE-001",
					partyId: PARTY_ID,
					currencyCode: "USD",
				},
				options,
			);
			if (!created.ok) {
				throw new Error(created.message);
			}
			const line = await addSalesOrderLine(
				{
					...mutationContext("drizzle-line"),
					orderId: created.data.id,
					expectedVersion: created.data.version,
					itemId: ITEM_ID,
					quantity: "2",
					unitPrice: "12.5",
				},
				options,
			);
			if (!line.ok) {
				throw new Error(line.message);
			}
			const submitted = await submitSalesOrder(
				{
					...mutationContext("drizzle-submit"),
					orderId: created.data.id,
					expectedVersion: 2,
				},
				options,
			);
			if (!submitted.ok) {
				throw new Error(submitted.message);
			}
			const approved = await approveSalesOrder(
				{
					...mutationContext("drizzle-approve"),
					orderId: created.data.id,
					expectedVersion: submitted.data.version,
				},
				options,
			);
			if (!approved.ok) {
				throw new Error(approved.message);
			}
			const released = await postSalesOrder(
				{
					...mutationContext("drizzle-post"),
					orderId: created.data.id,
					expectedVersion: approved.data.version,
				},
				options,
			);
			if (!released.ok) {
				throw new Error(released.message);
			}
			expect(released.data.status).toBe("released");
			expect(released.data.documentTotal).toBe("25.000000");

			const crossTenant = await getSalesOrderById(
				{
					organizationId: OTHER_ORGANIZATION_ID,
					actorUserId: ACTOR_USER_ID,
					correlationId: "test:drizzle-cross-tenant",
					id: created.data.id,
				},
				options,
			);
			expect(crossTenant).toEqual({ ok: true, data: null });

			const evidence = await db.execute(sql`
			SELECT
				(SELECT count(*)::int FROM platform_audit_log WHERE organization_id = ${ORGANIZATION_ID} AND correlation_id LIKE 'test:drizzle-%') AS audit_count,
				(SELECT count(*)::int FROM platform_domain_event WHERE organization_id = ${ORGANIZATION_ID} AND correlation_id LIKE 'test:drizzle-%') AS event_count
		`);
			expect(evidence.rows[0]).toMatchObject({
				audit_count: 5,
				event_count: 5,
			});
		});
	},
);
