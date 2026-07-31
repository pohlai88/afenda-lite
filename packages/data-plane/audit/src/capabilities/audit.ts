/**
 * @afenda/audit permanent capability facade.
 *
 * Audit vocabulary, validation, masking, serialization, persistence adapters,
 * transaction preparation, queries, retention, and diagnostics remain bound
 * to one owner. Consumers receive operations, never implementation classes.
 */

import { auditEntriesToCsv } from "../csv";
import {
	decodeAuditCursor,
	encodeAuditCursor,
	MAX_AUDIT_CURSOR_LENGTH,
} from "../cursor";
import { computeDiff, maskSensitiveData } from "../differ";
import { createDrizzleAuditStore } from "../drizzle-store";
import {
	MAX_AUDIT_JSON_ARRAY_ITEMS,
	MAX_AUDIT_JSON_BYTES,
	MAX_AUDIT_JSON_DEPTH,
	MAX_AUDIT_JSON_KEY_LENGTH,
	MAX_AUDIT_JSON_OBJECT_KEYS,
	MAX_AUDIT_JSON_STRING_LENGTH,
} from "../json-policy";
import { prepareAuditWrite } from "../prepare-write";
import {
	countByAction,
	exportAuditLog,
	exportAuditLogDetailed,
	getEntityHistory,
	getUserActivity,
	purgeOldEntries,
	queryAuditLog,
	queryAuditLogCursor,
} from "../query";
import { createAuditRecorder } from "../recorder";
import {
	auditActionSchema,
	auditCursorPageSchema,
	auditCursorQueryInputSchema,
	auditDetailedExportOptionsSchema,
	auditEventContextSchema,
	auditEventOutcomeSchema,
	auditExportOptionsSchema,
	auditPageSchema,
	auditPurgeOptionsSchema,
	auditQueryOptionsSchema,
	changeSchema,
	DEFAULT_AUDIT_PAGE,
	DEFAULT_AUDIT_PAGE_SIZE,
	MAX_AUDIT_CHANGES,
	MAX_AUDIT_EXPORT_ROWS,
	MAX_AUDIT_IDENTIFIER_LENGTH,
	MAX_AUDIT_IP_ADDRESS_LENGTH,
	MAX_AUDIT_PAGE_SIZE,
	MAX_AUDIT_PRINCIPAL_ID_LENGTH,
	MAX_AUDIT_USER_AGENT_LENGTH,
	recordAuditCommandSchema,
} from "../schemas";
import {
	AUDIT_TELEMETRY_CHANNEL,
	AUDIT_TELEMETRY_OPERATIONS,
	auditTelemetryEventSchema,
} from "../telemetry";
import {
	buildTransactionalAuditInsert,
	prepareDerivedEntityAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "../transaction-write";
import { AUDIT_ACTIONS, AUDIT_EVENT_OUTCOMES } from "../types";

const cursor = Object.freeze({
	decode: decodeAuditCursor,
	encode: encodeAuditCursor,
});

const data = Object.freeze({
	diff: computeDiff,
	mask: maskSensitiveData,
});

const exportCapability = Object.freeze({
	content: exportAuditLog,
	csv: auditEntriesToCsv,
	detailed: exportAuditLogDetailed,
});

const limits = Object.freeze({
	changes: MAX_AUDIT_CHANGES,
	cursorLength: MAX_AUDIT_CURSOR_LENGTH,
	exportRows: MAX_AUDIT_EXPORT_ROWS,
	identifierLength: MAX_AUDIT_IDENTIFIER_LENGTH,
	ipAddressLength: MAX_AUDIT_IP_ADDRESS_LENGTH,
	jsonArrayItems: MAX_AUDIT_JSON_ARRAY_ITEMS,
	jsonBytes: MAX_AUDIT_JSON_BYTES,
	jsonDepth: MAX_AUDIT_JSON_DEPTH,
	jsonKeyLength: MAX_AUDIT_JSON_KEY_LENGTH,
	jsonObjectKeys: MAX_AUDIT_JSON_OBJECT_KEYS,
	jsonStringLength: MAX_AUDIT_JSON_STRING_LENGTH,
	page: DEFAULT_AUDIT_PAGE,
	pageSize: DEFAULT_AUDIT_PAGE_SIZE,
	pageSizeMaximum: MAX_AUDIT_PAGE_SIZE,
	principalIdLength: MAX_AUDIT_PRINCIPAL_ID_LENGTH,
	userAgentLength: MAX_AUDIT_USER_AGENT_LENGTH,
});

const read = Object.freeze({
	countByAction,
	cursor: queryAuditLogCursor,
	entityHistory: getEntityHistory,
	page: queryAuditLog,
	userActivity: getUserActivity,
});

const schemas = Object.freeze({
	action: auditActionSchema,
	change: changeSchema,
	cursorPage: auditCursorPageSchema,
	cursorQuery: auditCursorQueryInputSchema,
	eventContext: auditEventContextSchema,
	eventOutcome: auditEventOutcomeSchema,
	export: auditExportOptionsSchema,
	exportDetailed: auditDetailedExportOptionsSchema,
	page: auditPageSchema,
	purge: auditPurgeOptionsSchema,
	query: auditQueryOptionsSchema,
	record: recordAuditCommandSchema,
});

const store = Object.freeze({
	drizzle: createDrizzleAuditStore,
});

const telemetry = Object.freeze({
	channel: AUDIT_TELEMETRY_CHANNEL,
	operations: AUDIT_TELEMETRY_OPERATIONS,
	schema: auditTelemetryEventSchema,
});

const transaction = Object.freeze({
	buildInsert: buildTransactionalAuditInsert,
	prepare: prepareTransactionalAuditInsertValues,
	prepareDerived: prepareDerivedEntityAuditInsertValues,
});

const vocabulary = Object.freeze({
	actions: AUDIT_ACTIONS,
	eventOutcomes: AUDIT_EVENT_OUTCOMES,
});

/** Permanent root capability for general domain activity audit. */
export const audit = Object.freeze({
	cursor,
	data,
	export: exportCapability,
	limits,
	read,
	recorder: createAuditRecorder,
	retention: Object.freeze({ purge: purgeOldEntries }),
	schemas,
	store,
	telemetry,
	transaction,
	vocabulary,
	write: Object.freeze({ prepare: prepareAuditWrite }),
});
