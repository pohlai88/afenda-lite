import type { Result } from "@afenda/errors";
import type { HumanResourcesPermission } from "../../kernel/authorization/permissions";

export type HumanResourcesExportFieldValue = string | number | boolean | null;

export interface HumanResourcesExportSourceRecord {
	effectiveFrom: string | null;
	effectiveTo: string | null;
	fields: Readonly<Record<string, HumanResourcesExportFieldValue>>;
	occurredOn: string;
	organizationId: string;
	recordId: string;
}

export interface HumanResourcesBulkExportRequest {
	actorUserId: string;
	correlationId: string;
	dateFrom?: string;
	dateTo?: string;
	effectiveOn?: string;
	exportType: string;
	organizationId: string;
	requestedFields: readonly string[];
	requiredPermission: HumanResourcesPermission;
}

export interface HumanResourcesBulkExportRow {
	fields: Readonly<Record<string, HumanResourcesExportFieldValue>>;
	recordId: string;
}

export interface HumanResourcesBulkExportResult {
	exportType: string;
	fields: readonly string[];
	organizationId: string;
	privacyEvidenceId: string;
	rows: readonly HumanResourcesBulkExportRow[];
}

export interface HumanResourcesBulkExportSource {
	list: (input: {
		organizationId: string;
		dateFrom?: string;
		dateTo?: string;
		effectiveOn?: string;
	}) => Promise<Result<readonly HumanResourcesExportSourceRecord[]>>;
}

export interface HumanResourcesBulkExportPorts {
	authorize: (input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	}) => Promise<boolean>;
	recordPrivacyEvidence: (input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		exportType: string;
		fields: readonly string[];
		rowCount: number;
		dateFrom: string | null;
		dateTo: string | null;
		effectiveOn: string | null;
	}) => Promise<Result<{ evidenceId: string }>>;
}

export interface HumanResourcesBulkExportDefinition {
	allowedFields: readonly string[];
	exportType: string;
	maximumRows: number;
	requiredPermission: HumanResourcesPermission;
}
