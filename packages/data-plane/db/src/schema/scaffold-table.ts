import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Minimal tenant-root scaffold for ERP packages awaiting column design.
 * Every table: id, organization_id, created_at, updated_at + org id index.
 */
export function createErpScaffoldTable(tableName: string) {
	return pgTable(
		tableName,
		{
			id: uuid("id").primaryKey().defaultRandom(),
			organizationId: text("organization_id").notNull(),
			createdAt: timestamp("created_at", { withTimezone: true })
				.notNull()
				.defaultNow(),
			updatedAt: timestamp("updated_at", { withTimezone: true })
				.notNull()
				.defaultNow(),
		},
		(table) => [
			index(`${tableName}_org_id_idx`).on(table.organizationId, table.id),
		],
	);
}
