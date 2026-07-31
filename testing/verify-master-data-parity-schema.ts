// Master-data schema probes consume the permanent DB package facade.

import { database, sql } from "@afenda/db";
import { testingDatabase } from "@afenda/testing";
import verifyMasterDataCoreParitySchema from "./verify-master-data-core-parity-schema.ts";

const REQUIRED_IMPORT_RECOVERY_COLUMNS = 6;

export default async function verifyMasterDataParitySchema(): Promise<void> {
	await verifyMasterDataCoreParitySchema();
	process.env.REQUIRE_DATABASE_TESTS = "1";
	testingDatabase.setup();
	const importRecoverySchema = await database.client.execute(sql`
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
