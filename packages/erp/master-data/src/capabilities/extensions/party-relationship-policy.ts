import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type {
	PartyRelationshipDirection,
	PartyRelationshipType,
} from "../../types";

export type PartyRelationshipDefinition = Readonly<{
	direction: PartyRelationshipDirection;
	canonicalType: PartyRelationshipType;
	reverseToCanonical: boolean;
	permitsSelfReference: boolean;
}>;

export const PARTY_RELATIONSHIP_DEFINITIONS = {
	parent_of: {
		direction: "hierarchical",
		canonicalType: "parent_of",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	subsidiary_of: {
		direction: "hierarchical",
		canonicalType: "parent_of",
		reverseToCanonical: true,
		permitsSelfReference: false,
	},
	owned_by: {
		direction: "directional",
		canonicalType: "owned_by",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	contact_for: {
		direction: "directional",
		canonicalType: "contact_for",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	bill_to_for: {
		direction: "directional",
		canonicalType: "bill_to_for",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	ship_to_for: {
		direction: "directional",
		canonicalType: "ship_to_for",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	supplies: {
		direction: "directional",
		canonicalType: "supplies",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	distributes_for: {
		direction: "directional",
		canonicalType: "distributes_for",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	franchisee_of: {
		direction: "directional",
		canonicalType: "franchisee_of",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	related_party: {
		direction: "symmetric",
		canonicalType: "related_party",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	landlord_of: {
		direction: "reciprocal",
		canonicalType: "landlord_of",
		reverseToCanonical: false,
		permitsSelfReference: false,
	},
	tenant_of: {
		direction: "reciprocal",
		canonicalType: "landlord_of",
		reverseToCanonical: true,
		permitsSelfReference: false,
	},
} as const satisfies Record<PartyRelationshipType, PartyRelationshipDefinition>;

export type CanonicalPartyRelationship = Readonly<{
	sourcePartyId: string;
	targetPartyId: string;
	relationshipType: PartyRelationshipType;
	direction: PartyRelationshipDirection;
}>;

export type PartyRelationshipPathEdge = Readonly<{
	sourcePartyId: string;
	targetPartyId: string;
	relationshipType: PartyRelationshipType;
}>;

export type PartyParentRelationshipEdge = PartyRelationshipPathEdge & {
	relationshipType: "parent_of";
};

export function compareCanonicalPartyIds(left: string, right: string): number {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
}

/** Stores one canonical row; inverse and symmetric views are derived by queries. */
export function canonicalizePartyRelationship(input: {
	sourcePartyId: string;
	targetPartyId: string;
	relationshipType: PartyRelationshipType;
}): Result<CanonicalPartyRelationship> {
	const definition = PARTY_RELATIONSHIP_DEFINITIONS[input.relationshipType];
	if (
		input.sourcePartyId === input.targetPartyId &&
		!definition.permitsSelfReference
	) {
		return fail("BAD_REQUEST", "Party relationship cannot reference itself", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "targetPartyId",
		} satisfies MasterFailureDetails);
	}

	let { sourcePartyId, targetPartyId } = input;
	if (definition.reverseToCanonical) {
		[sourcePartyId, targetPartyId] = [targetPartyId, sourcePartyId];
	} else if (
		definition.direction === "symmetric" &&
		compareCanonicalPartyIds(sourcePartyId, targetPartyId) > 0
	) {
		[sourcePartyId, targetPartyId] = [targetPartyId, sourcePartyId];
	}

	return ok({
		sourcePartyId,
		targetPartyId,
		relationshipType: definition.canonicalType,
		direction: definition.direction,
	});
}

/**
 * Returns true when at least one stored edge connects `fromPartyId` to `toPartyId`.
 */
function hasDirectedPartyPath(
	edges: Iterable<Readonly<{ sourcePartyId: string; targetPartyId: string }>>,
	fromPartyId: string,
	toPartyId: string,
): boolean {
	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const targets = adjacency.get(edge.sourcePartyId) ?? [];
		targets.push(edge.targetPartyId);
		adjacency.set(edge.sourcePartyId, targets);
	}

	const pending = [...(adjacency.get(fromPartyId) ?? [])];
	const visited = new Set<string>([fromPartyId]);
	while (pending.length > 0) {
		const current = pending.pop();
		if (current === undefined || visited.has(current)) {
			continue;
		}
		if (current === toPartyId) {
			return true;
		}
		visited.add(current);
		pending.push(...(adjacency.get(current) ?? []));
	}
	return false;
}

export function hasCanonicalPartyRelationshipPath(
	edges: Iterable<PartyRelationshipPathEdge>,
	relationshipType: PartyRelationshipType,
	fromPartyId: string,
	toPartyId: string,
): boolean {
	return hasDirectedPartyPath(
		[...edges].filter((edge) => edge.relationshipType === relationshipType),
		fromPartyId,
		toPartyId,
	);
}

export function hasPartyParentPath(
	edges: Iterable<PartyParentRelationshipEdge>,
	fromPartyId: string,
	toPartyId: string,
): boolean {
	return hasDirectedPartyPath(edges, fromPartyId, toPartyId);
}
