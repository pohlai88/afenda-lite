import type {
	HumanResourcesDepartmentId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
} from "../brands";
import {
	type EffectiveLineageResolution,
	resolveEffectiveLineageRecord,
} from "../shared/effective-lineage";
import type { LineageSegmentStatus } from "../workforce-foundation/types";

export type DepartmentStructureVersion = {
	id: string;
	organizationId: string;
	departmentId: HumanResourcesDepartmentId;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesStructureVersionId: string | null;
	lineageStatus: LineageSegmentStatus;
	reasonCode: string;
	evidenceRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DepartmentStructureAtAsOf = {
	departmentId: HumanResourcesDepartmentId;
	organizationId: string;
	name: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	structureVersionId: string;
};

export type JobDefinitionVersion = {
	id: string;
	organizationId: string;
	jobId: HumanResourcesJobId;
	title: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesDefinitionVersionId: string | null;
	lineageStatus: LineageSegmentStatus;
	reasonCode: string;
	evidenceRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type JobDefinitionAtAsOf = {
	jobId: HumanResourcesJobId;
	organizationId: string;
	title: string;
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	definitionVersionId: string;
};

export type PositionDefinitionVersion = {
	id: string;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	title: string;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesDefinitionVersionId: string | null;
	lineageStatus: LineageSegmentStatus;
	reasonCode: string;
	evidenceRef: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PositionDefinitionAtAsOf = {
	positionId: HumanResourcesPositionId;
	organizationId: string;
	title: string;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	asOf: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	definitionVersionId: string;
};

function isLineageEligible(version: { lineageStatus: LineageSegmentStatus }): boolean {
	return (
		version.lineageStatus === "active" || version.lineageStatus === "superseded"
	);
}

function findLineageLeaf<TVersion extends { id: string }>(
	versions: readonly TVersion[],
	getPredecessorId: (version: TVersion) => string | null,
): TVersion | null {
	const leaves = versions.filter(
		(leaf) =>
			!versions.some(
				(candidate) => getPredecessorId(candidate) === leaf.id,
			),
	);
	if (leaves.length !== 1) {
		return null;
	}
	return leaves[0] ?? null;
}

export function resolveDepartmentStructureAsOf(input: {
	versions: readonly DepartmentStructureVersion[];
	departmentId: HumanResourcesDepartmentId;
	asOf: string;
}): EffectiveLineageResolution<DepartmentStructureVersion> {
	const lineageVersions = input.versions.filter(
		(version) =>
			version.departmentId === input.departmentId &&
			isLineageEligible(version),
	);
	const leaf = findLineageLeaf(
		lineageVersions,
		(version) => version.supersedesStructureVersionId,
	);
	if (leaf === null) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}

	return resolveEffectiveLineageRecord({
		assignedId: leaf.id,
		records: lineageVersions,
		asOf: input.asOf,
		getPredecessorId: (record) => record.supersedesStructureVersionId,
		isEligible: isLineageEligible,
	});
}

export function resolveJobDefinitionAsOf(input: {
	versions: readonly JobDefinitionVersion[];
	jobId: HumanResourcesJobId;
	asOf: string;
}): EffectiveLineageResolution<JobDefinitionVersion> {
	const lineageVersions = input.versions.filter(
		(version) =>
			version.jobId === input.jobId && isLineageEligible(version),
	);
	const leaf = findLineageLeaf(
		lineageVersions,
		(version) => version.supersedesDefinitionVersionId,
	);
	if (leaf === null) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}

	return resolveEffectiveLineageRecord({
		assignedId: leaf.id,
		records: lineageVersions,
		asOf: input.asOf,
		getPredecessorId: (record) => record.supersedesDefinitionVersionId,
		isEligible: isLineageEligible,
	});
}

export function resolvePositionDefinitionAsOf(input: {
	versions: readonly PositionDefinitionVersion[];
	positionId: HumanResourcesPositionId;
	asOf: string;
}): EffectiveLineageResolution<PositionDefinitionVersion> {
	const lineageVersions = input.versions.filter(
		(version) =>
			version.positionId === input.positionId && isLineageEligible(version),
	);
	const leaf = findLineageLeaf(
		lineageVersions,
		(version) => version.supersedesDefinitionVersionId,
	);
	if (leaf === null) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}

	return resolveEffectiveLineageRecord({
		assignedId: leaf.id,
		records: lineageVersions,
		asOf: input.asOf,
		getPredecessorId: (record) => record.supersedesDefinitionVersionId,
		isEligible: isLineageEligible,
	});
}

export function findOpenDepartmentStructureVersion(
	versions: readonly DepartmentStructureVersion[],
	organizationId: string,
	departmentId: HumanResourcesDepartmentId,
): DepartmentStructureVersion | null {
	for (const version of versions) {
		if (
			version.organizationId === organizationId &&
			version.departmentId === departmentId &&
			version.effectiveTo === null &&
			version.lineageStatus === "active"
		) {
			return version;
		}
	}
	return null;
}

export function findOpenJobDefinitionVersion(
	versions: readonly JobDefinitionVersion[],
	organizationId: string,
	jobId: HumanResourcesJobId,
): JobDefinitionVersion | null {
	for (const version of versions) {
		if (
			version.organizationId === organizationId &&
			version.jobId === jobId &&
			version.effectiveTo === null &&
			version.lineageStatus === "active"
		) {
			return version;
		}
	}
	return null;
}

export function findOpenPositionDefinitionVersion(
	versions: readonly PositionDefinitionVersion[],
	organizationId: string,
	positionId: HumanResourcesPositionId,
): PositionDefinitionVersion | null {
	for (const version of versions) {
		if (
			version.organizationId === organizationId &&
			version.positionId === positionId &&
			version.effectiveTo === null &&
			version.lineageStatus === "active"
		) {
			return version;
		}
	}
	return null;
}
