import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	createPartyExternalId,
	findPartyByExternalId,
} from "../src/extensions";
import { findPartyDuplicateWarnings, mergeParties } from "../src/merge";
import { createParty, getPartyByCode } from "../src/party";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedMergePartiesChangeRequest } from "./helpers/mdg-approve";

function ctx(organizationId = "org-merge") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

describe("@afenda/master-data mergeParties", () => {
	it("merges same-org parties, preserves former code lookup, emits merged.v1", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const source = await createParty(
			{
				...ctx(),
				code: "SRC1",
				name: "Source Co",
				partyKind: "organization",
				registrationNumber: "REG-1",
			},
			options,
		);
		const target = await createParty(
			{
				...ctx(),
				code: "TGT1",
				name: "Target Co",
				partyKind: "organization",
			},
			options,
		);
		expect(source.ok && target.ok).toBe(true);
		if (!source.ok || !target.ok) {
			return;
		}

		await createPartyExternalId(
			{
				...ctx(),
				partyId: source.data.id,
				system: "erp",
				namespace: "party",
				externalId: "E-SRC",
			},
			options,
		);

		const cr = await approvedMergePartiesChangeRequest(
			{
				organizationId: "org-merge",
				sourcePartyId: source.data.id,
				targetPartyId: target.data.id,
				fieldDecisions: { name: "source" },
			},
			options,
		);
		const merged = await mergeParties(
			{
				...ctx(),
				changeRequestId: cr.id,
				sourcePartyId: source.data.id,
				targetPartyId: target.data.id,
				sourceExpectedVersion: source.data.version,
				targetExpectedVersion: target.data.version,
				fieldDecisions: { name: "source" },
			},
			options,
		);
		expect(merged.ok).toBe(true);
		if (!merged.ok) {
			return;
		}
		expect(merged.data.survivor.name).toBe("Source Co");
		expect(merged.data.merged.mergedIntoId).toBe(target.data.id);
		expect(merged.data.merged.status).toBe("retired");

		const byFormer = await findPartyByExternalId(
			{
				organizationId: "org-merge",
				actorUserId: "user-1",
				system: "afenda.former_code",
				namespace: "",
				externalId: "SRC1",
			},
			options,
		);
		expect(byFormer.ok && byFormer.data?.id === target.data.id).toBe(true);

		const byErp = await findPartyByExternalId(
			{
				organizationId: "org-merge",
				actorUserId: "user-1",
				system: "erp",
				namespace: "party",
				externalId: "E-SRC",
			},
			options,
		);
		expect(byErp.ok && byErp.data?.id === target.data.id).toBe(true);

		const sourceCodeGone = await getPartyByCode(
			{ organizationId: "org-merge", actorUserId: "user-1", code: "SRC1" },
			options,
		);
		expect(sourceCodeGone.ok && sourceCodeGone.data === null).toBe(true);

		expect(
			ports.outbox.calls.some((e) => e.type === "master_data.party.merged.v1"),
		).toBe(true);
	});

	it("rejects cross-kind and cross-org merges", async () => {
		const { options } = createMasterDataTestHarness();

		const orgParty = await createParty(
			{
				...ctx("org-a"),
				code: "O1",
				name: "Org",
				partyKind: "organization",
			},
			options,
		);
		const person = await createParty(
			{
				...ctx("org-a"),
				code: "P1",
				name: "Person",
				partyKind: "person",
			},
			options,
		);
		expect(orgParty.ok && person.ok).toBe(true);
		if (!orgParty.ok || !person.ok) {
			return;
		}

		const kindCr = await approvedMergePartiesChangeRequest(
			{
				organizationId: "org-a",
				sourcePartyId: orgParty.data.id,
				targetPartyId: person.data.id,
			},
			options,
		);
		const kindMismatch = await mergeParties(
			{
				...ctx("org-a"),
				changeRequestId: kindCr.id,
				sourcePartyId: orgParty.data.id,
				targetPartyId: person.data.id,
				sourceExpectedVersion: orgParty.data.version,
				targetExpectedVersion: person.data.version,
				fieldDecisions: {},
			},
			options,
		);
		expect(kindMismatch.ok).toBe(false);

		const otherOrg = await createParty(
			{
				...ctx("org-b"),
				code: "O2",
				name: "Other",
				partyKind: "organization",
			},
			options,
		);
		expect(otherOrg.ok).toBe(true);
		if (!otherOrg.ok) {
			return;
		}

		const crossCr = await approvedMergePartiesChangeRequest(
			{
				organizationId: "org-a",
				sourcePartyId: orgParty.data.id,
				targetPartyId: otherOrg.data.id,
			},
			options,
		);
		const crossOrg = await mergeParties(
			{
				...ctx("org-a"),
				changeRequestId: crossCr.id,
				sourcePartyId: orgParty.data.id,
				targetPartyId: otherOrg.data.id,
				sourceExpectedVersion: orgParty.data.version,
				targetExpectedVersion: otherOrg.data.version,
				fieldDecisions: {},
			},
			options,
		);
		expect(crossOrg.ok).toBe(false);
	});

	it("emits duplicate warnings without auto-merge", async () => {
		const { options } = createMasterDataTestHarness();

		await createParty(
			{
				...ctx(),
				code: "DUP1",
				name: "Acme Trading",
				partyKind: "organization",
				registrationNumber: "R-9",
			},
			options,
		);

		const warnings = await findPartyDuplicateWarnings(
			{
				organizationId: "org-merge",
				actorUserId: "user-1",
				name: "Acme Trading",
				registrationNumber: "R-9",
			},
			options,
		);
		expect(warnings.ok).toBe(true);
		if (!warnings.ok) {
			return;
		}
		expect(warnings.data.some((w) => w.signal === "name")).toBe(true);
		expect(warnings.data.some((w) => w.signal === "registration")).toBe(true);
	});
});
