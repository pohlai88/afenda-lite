import type { Result } from "@afenda/errors/result";
import type { HumanResourcesPermission } from "../permissions";

export type HumanResourcesExportFieldValue = string | number | boolean | null;

export type HumanResourcesExportSourceRecord = {
	organizationId: string;
	recordId: string;
	effectiveFrom: string | null;
	effectiveTo: string | null;
	occurredOn: string;
	fields: Readonly<Record<string, HumanResourcesExportFieldValue>>;
};

export type HumanResourcesBulkExportRequest = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	requiredPermission: HumanResourcesPermission;
	exportType: string;
	requestedFields: readonly string[];
	dateFrom?: string;
	dateTo?: string;
	effectiveOn?: string;
};

export type HumanResourcesBulkExportRow = {
	recordId: string;
	fields: Readonly<Record<string, HumanResourcesExportFieldValue>>;
};

export type HumanResourcesBulkExportResult = {
	organizationId: string;
	exportType: string;
	fields: readonly string[];
	rows: readonly HumanResourcesBulkExportRow[];
	privacyEvidenceId: string;
};

export type HumanResourcesBulkExportSource = {
	list(input: {
		organizationId: string;
		dateFrom?: string;
		dateTo?: string;
		effectiveOn?: string;
	}): Promise<Result<readonly HumanResourcesExportSourceRecord[]>>;
};

export type HumanResourcesBulkExportPorts = {
	authorize(input: {
		organizationId: string;
		actorUserId: string;
		permission: HumanResourcesPermission;
	}): Promise<boolean>;
	recordPrivacyEvidence(input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		exportType: string;
		fields: readonly string[];
		rowCount: number;
		dateFrom: string | null;
		dateTo: string | null;
		effectiveOn: string | null;
	}): Promise<Result<{ evidenceId: string }>>;
};

export type HumanResourcesBulkExportDefinition = {
	exportType: string;
	requiredPermission: HumanResourcesPermission;
	allowedFields: readonly string[];
	maximumRows: number;
};
