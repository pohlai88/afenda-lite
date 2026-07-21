import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
} from "../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import type { Department, ReportingLine } from "../types";
import { conflict, invalidInput, invalidState } from "./domain-guards";
import type {
	DepartmentStatus,
	JobStatus,
	PositionStatus,
} from "./employment-status";

export const ORGANIZATION_TREE_DEFAULT_MAX_DEPTH = 5;
export const ORGANIZATION_TREE_HARD_MAX_DEPTH = 10;
export const ORGANIZATION_TREE_DEFAULT_MAX_NODES = 500;
export const ORGANIZATION_TREE_HARD_MAX_NODES = 2000;

export function assertActiveDepartment(status: DepartmentStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Department is not active");
	}
	return ok(undefined);
}

export function assertActiveJob(status: JobStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Job is not active");
	}
	return ok(undefined);
}

export function assertPositionAssignable(status: PositionStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Position is not active");
	}
	return ok(undefined);
}

export function canTransitionDepartmentStatus(
	current: DepartmentStatus,
	next: DepartmentStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && next === "archived") return true;
	if (current === "archived" && next === "active") return true;
	return false;
}

export function canTransitionJobStatus(
	current: JobStatus,
	next: JobStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && next === "archived") return true;
	if (current === "archived" && next === "active") return true;
	return false;
}

export function canTransitionPositionStatus(
	current: PositionStatus,
	next: PositionStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && (next === "frozen" || next === "closed")) {
		return true;
	}
	if (current === "frozen" && (next === "active" || next === "closed")) {
		return true;
	}
	return false;
}

export function assertDepartmentStatusTransition(
	current: DepartmentStatus,
	next: DepartmentStatus,
): Result<void> {
	if (!canTransitionDepartmentStatus(current, next)) {
		return fail(
			"BAD_REQUEST",
			`Cannot transition department from '${current}' to '${next}'`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return ok(undefined);
}

export function assertJobStatusTransition(
	current: JobStatus,
	next: JobStatus,
): Result<void> {
	if (!canTransitionJobStatus(current, next)) {
		return fail(
			"BAD_REQUEST",
			`Cannot transition job from '${current}' to '${next}'`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return ok(undefined);
}

export function assertPositionStatusTransition(
	current: PositionStatus,
	next: PositionStatus,
): Result<void> {
	if (!canTransitionPositionStatus(current, next)) {
		return fail(
			"BAD_REQUEST",
			`Cannot transition position from '${current}' to '${next}'`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return ok(undefined);
}

/**
 * Walk parent chain from proposedParentId; fail if departmentId appears
 * (would create a cycle) or self-parent.
 */
export function assertDepartmentParentAcyclic(input: {
	departmentId: HumanResourcesDepartmentId;
	proposedParentId: HumanResourcesDepartmentId | null;
	getParentId: (
		id: HumanResourcesDepartmentId,
	) => HumanResourcesDepartmentId | null | undefined;
}): Result<void> {
	if (input.proposedParentId === null) {
		return ok(undefined);
	}
	if (input.proposedParentId === input.departmentId) {
		return invalidInput("Department cannot be its own parent");
	}

	let current: HumanResourcesDepartmentId | null = input.proposedParentId;
	const seen = new Set<string>([input.departmentId]);
	while (current !== null) {
		if (seen.has(current)) {
			return conflict("Department parent relationship would create a cycle");
		}
		seen.add(current);
		const parent = input.getParentId(current);
		if (parent === undefined) {
			return invalidInput("Department parent not found in organization");
		}
		current = parent;
	}
	return ok(undefined);
}

/**
 * Fail if assigning managerEmployeeId as primary manager of employeeId would
 * create a reporting cycle (manager chain includes employee).
 */
export function assertReportingLineAcyclic(input: {
	employeeId: HumanResourcesEmployeeId;
	managerEmployeeId: HumanResourcesEmployeeId;
	getOpenPrimaryManagerId: (
		employeeId: HumanResourcesEmployeeId,
	) => HumanResourcesEmployeeId | null | undefined;
}): Result<void> {
	if (input.employeeId === input.managerEmployeeId) {
		return invalidInput("Employee cannot report to themselves");
	}

	let current: HumanResourcesEmployeeId | null = input.managerEmployeeId;
	const seen = new Set<string>([input.employeeId]);
	while (current !== null) {
		if (seen.has(current)) {
			return conflict("Reporting line would create a cycle");
		}
		seen.add(current);
		const manager = input.getOpenPrimaryManagerId(current);
		if (manager === undefined) {
			return invalidInput("Manager chain references missing employee");
		}
		current = manager;
	}
	return ok(undefined);
}

/** Half-open style date overlap: ranges overlap when both open or intervals intersect. */
export function datesOverlap(input: {
	startsOnA: string;
	endsOnA: string | null;
	startsOnB: string;
	endsOnB: string | null;
}): boolean {
	const endA = input.endsOnA ?? "9999-12-31";
	const endB = input.endsOnB ?? "9999-12-31";
	return input.startsOnA <= endB && input.startsOnB <= endA;
}

export function assertNoPrimaryReportingOverlap(input: {
	candidateStartsOn: string;
	candidateEndsOn: string | null;
	existing: readonly ReportingLine[];
}): Result<void> {
	for (const line of input.existing) {
		if (line.relationshipKind !== "primary") continue;
		if (
			datesOverlap({
				startsOnA: input.candidateStartsOn,
				endsOnA: input.candidateEndsOn,
				startsOnB: line.startsOn,
				endsOnB: line.endsOn,
			})
		) {
			return fail(
				"CONFLICT",
				"Primary reporting line date range overlaps an existing primary line",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
			);
		}
	}
	return ok(undefined);
}

export function buildBoundedDepartmentTree(input: {
	departments: readonly Department[];
	rootDepartmentId: HumanResourcesDepartmentId | null;
	maxDepth: number;
	maxNodes: number;
}): {
	nodes: Array<{
		id: HumanResourcesDepartmentId;
		parentDepartmentId: HumanResourcesDepartmentId | null;
		code: string;
		name: string;
		status: DepartmentStatus;
		depth: number;
	}>;
	truncated: boolean;
} {
	const byParent = new Map<string | null, Department[]>();
	for (const dept of input.departments) {
		const key = dept.parentDepartmentId;
		const list = byParent.get(key) ?? [];
		list.push(dept);
		byParent.set(key, list);
	}
	for (const list of byParent.values()) {
		list.sort((a, b) => a.code.localeCompare(b.code));
	}

	const nodes: Array<{
		id: HumanResourcesDepartmentId;
		parentDepartmentId: HumanResourcesDepartmentId | null;
		code: string;
		name: string;
		status: DepartmentStatus;
		depth: number;
	}> = [];
	let truncated = false;

	const roots =
		input.rootDepartmentId === null
			? (byParent.get(null) ?? [])
			: input.departments.filter((d) => d.id === input.rootDepartmentId);

	type QueueItem = { department: Department; depth: number };
	const queue: QueueItem[] = roots.map((department) => ({
		department,
		depth: 0,
	}));

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;
		if (nodes.length >= input.maxNodes) {
			truncated = true;
			break;
		}
		nodes.push({
			id: item.department.id,
			parentDepartmentId: item.department.parentDepartmentId,
			code: item.department.code,
			name: item.department.name,
			status: item.department.status,
			depth: item.depth,
		});
		if (item.depth >= input.maxDepth) {
			const children = byParent.get(item.department.id) ?? [];
			if (children.length > 0) {
				truncated = true;
			}
			continue;
		}
		const children = byParent.get(item.department.id) ?? [];
		for (const child of children) {
			queue.push({ department: child, depth: item.depth + 1 });
		}
	}

	if (queue.length > 0) {
		truncated = true;
	}

	return { nodes, truncated };
}
