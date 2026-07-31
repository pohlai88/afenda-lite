import type { AuditStore } from "@afenda/audit";
import type { database as afendaDatabase, NeonHttpSql } from "@afenda/db";

export type CorporateAdministrationDrizzleDatabase = Pick<
	typeof afendaDatabase.client,
	"execute" | "insert" | "select" | "update"
>;

export type CorporateAdministrationAuditWriter = Pick<AuditStore, "write">;

export type CorporateAdministrationNeonTransactionExecutor = (
	buildQueries: (sql: NeonHttpSql) => ReturnType<NeonHttpSql>[],
) => Promise<unknown>;
