// Master-data schema probes still use the DB package source while runner setup is root-owned.

import { setupDatabaseTestLane } from "@afenda/testing/setups/database";
import { db, sql } from "../packages/data-plane/db/src/index.ts";
import { verifyMasterDataCoreParitySchema } from "./verify-master-data-core-parity-schema.ts";

const REQUIRED_IMPORT_RECOVERY_COLUMNS = 6;

export default async function verifyMasterDataParitySchema(): Promise<void> {
	await verifyMasterDataCoreParitySchema();
	process.env.REQUIRE_DATABASE_TESTS = "1";
	setupDatabaseTestLane();
	const importRecoverySchema = await db.execute(sql`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND (
				(table_name = 'md_import_batch' AND column_name IN (
					'payload_hash',
					'operation_type',
					'lease_owner',
					'lease_expires_at',
					'completed_at'
				))
				OR (table_name = 'md_import_batch_row' AND column_name = 'id')
			)
	`);

	if (importRecoverySchema.rows.length !== REQUIRED_IMPORT_RECOVERY_COLUMNS) {
		throw new Error(
			"Master-data parity BLOCKED: migration 0029_master_data_import_recovery is not fully applied to DATABASE_URL.",
		);
	}
}
