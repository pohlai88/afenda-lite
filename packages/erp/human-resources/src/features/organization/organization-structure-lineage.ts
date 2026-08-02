import type {
	HumanResourcesDepartmentId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
} from "../../kernel/identity/brands";
import {
	type EffectiveLineageResolution,
	resolveEffectiveLineageRecord,
} from "../../kernel/temporal/effective-lineage";
import type { LineageSegmentStatus } from "../workforce-records/identity/types";

export interface DepartmentStructureVersion {
	createdAt: Date;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceRef: string | null;
	id: string;
	lineageStatus: LineageSegmentStatus;
	name: string;
	organizationId: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	reasonCode: string;
	supersedesStructureVersionId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface DepartmentStructureAtAsOf {
	asOf: string;
	departmentId: HumanResourcesDepartmentId;
	effectiveFrom: string;
	effectiveTo: string | null;
	name: string;
	organizationId: string;
	parentDepartmentId: HumanResourcesDepartmentId | null;
	structureVersionId: string;
}

export interface JobDefinitionVersion {
	createdAt: Date;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceRef: string | null;
	id: string;
	jobId: HumanResourcesJobId;
	lineageStatus: LineageSegmentStatus;
	organizationId: string;
	reasonCode: string;
	supersedesDefinitionVersionId: string | null;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface JobDefinitionAtAsOf {
	asOf: string;
	definitionVersionId: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	jobId: HumanResourcesJobId;
	organizationId: string;
	title: string;
}

export interface PositionDefinitionVersion {
	createdAt: Date;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceRef: string | null;
	id: string;
	jobId: HumanResourcesJobId | null;
	lineageStatus: LineageSegmentStatus;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	reasonCode: string;
	supersedesDefinitionVersionId: string | null;
	title: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PositionDefinitionAtAsOf {
	asOf: string;
	definitionVersionId: string;
	departmentId: HumanResourcesDepartmentId | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	jobId: HumanResourcesJobId | null;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	title: string;
}

function isLineageEligible(version: {
	lineageStatus: LineageSegmentStatus;
}): boolean {
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
			!versions.some((candidate) => getPredecessorId(candidate) === leaf.id),
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
			version.departmentId === input.departmentId && isLineageEligible(version),
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
		(version) => version.jobId === input.jobId && isLineageEligible(version),
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
