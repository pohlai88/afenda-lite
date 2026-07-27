import type { AuditStore } from "@afenda/audit";
import type { db, NeonHttpSql } from "@afenda/db";

export type CorporateAdministrationDrizzleDatabase = Pick<
	typeof db,
	"execute" | "insert" | "select" | "update"
>;

export type CorporateAdministrationAuditWriter = Pick<AuditStore, "write">;

export type CorporateAdministrationNeonTransactionExecutor = (
	buildQueries: (sql: NeonHttpSql) => ReturnType<NeonHttpSql>[],
) => Promise<unknown>;
