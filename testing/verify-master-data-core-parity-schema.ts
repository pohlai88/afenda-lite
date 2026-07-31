// Master-data schema probes still use the DB package source while runner setup is root-owned.

import { testingDatabase } from "@afenda/testing";
import { db, sql } from "../packages/data-plane/db/src/index.ts";

const REQUIRED_CORE_SCHEMA_MARKERS = 4;

export default async function verifyMasterDataCoreParitySchema(): Promise<void> {
	process.env.REQUIRE_DATABASE_TESTS = "1";
	testingDatabase.setup();
	const currentSchema = await db.execute(sql`
		SELECT table_name, column_name
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND (
				(table_name = 'md_party_external_id' AND column_name = 'source_system')
				OR (table_name = 'md_item_external_id' AND column_name = 'source_system')
				OR (table_name = 'md_warehouse_external_id' AND column_name = 'source_system')
				OR (table_name = 'md_item_variant_attribute_value_option' AND column_name = 'id')
			)
	`);

	if (currentSchema.rows.length !== REQUIRED_CORE_SCHEMA_MARKERS) {
		throw new Error(
			"Master-data core parity BLOCKED: DATABASE_URL is behind the package schema (required migrations 0012, 0016, 0018, and/or 0020 are absent). Reconcile the Drizzle journal and database migration ledger before release.",
		);
	}
}
