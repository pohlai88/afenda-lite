import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	approveChangeRequest,
	rejectChangeRequest,
	submitChangeRequest,
} from "../src/change-request";
import { activatePartyRole, createPartyRole } from "../src/extensions";
import { mergeParties } from "../src/merge";
import { activateParty, createParty } from "../src/party";
import { createMasterDataTestHarness } from "./helpers/harness";

function ctx(organizationId = "org-mdg") {
	return {
		organizationId,
		actorUserId: "user-maker",
		correlationId: randomUUID(),
	};
}

describe("@afenda/master-data change requests (MDG v1)", () => {
	it("blocks maker self-approve and supports reject path with versioned events", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const party = await createParty(
			{
				...ctx(),
				code: "MDG1",
				name: "MDG Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const submitted = await submitChangeRequest(
			{
				...ctx(),
				commandKind: "activate_party",
				payload: { partyId: party.data.id },
			},
			options,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		expect(submitted.data.status).toBe("submitted");
		expect(
			ports.outbox.calls.some(
				(e) => e.type === "master_data.change_request.submitted.v1",
			),
		).toBe(true);

		const selfApprove = await approveChangeRequest(
			{
				organizationId: "org-mdg",
				actorUserId: "user-maker",
				correlationId: randomUUID(),
				id: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			options,
		);
		expect(selfApprove.ok).toBe(false);
		if (selfApprove.ok) {
			return;
		}
		expect((selfApprove.details as { reason?: string }).reason).toBe(
			"MASTER_MAKER_CHECKER_VIOLATION",
		);

		const rejected = await rejectChangeRequest(
			{
				organizationId: "org-mdg",
				actorUserId: "user-checker",
				correlationId: randomUUID(),
				id: submitted.data.id,
				expectedVersion: submitted.data.version,
				reviewNote: "Incomplete registration",
			},
			options,
		);
		expect(rejected.ok).toBe(true);
		if (!rejected.ok) {
			return;
		}
		expect(rejected.data.status).toBe("rejected");
		expect(rejected.data.reviewNote).toBe("Incomplete registration");
		expect(
			ports.outbox.calls.some(
				(e) => e.type === "master_data.change_request.rejected.v1",
			),
		).toBe(true);
	});

	it("requires approved CR for activate and merge; apply marks CR applied", async () => {
		const { options, ports, store } = createMasterDataTestHarness();

		const party = await createParty(
			{
				...ctx(),
				code: "ACT1",
				name: "Activate Me",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}
		const role = await createPartyRole(
			{
				...ctx(),
				partyId: party.data.id,
				roleCode: "customer",
			},
			options,
		);
		expect(role.ok).toBe(true);
		if (!role.ok) {
			return;
		}
		await activatePartyRole(
			{
				...ctx(),
				id: role.data.id,
				expectedVersion: role.data.version,
			},
			options,
		);

		const withoutCr = await activateParty(
			{
				...ctx(),
				id: party.data.id,
				expectedVersion: party.data.version,
			},
			options,
		);
		expect(withoutCr.ok).toBe(false);
		if (!withoutCr.ok) {
			expect(withoutCr.details).toMatchObject({
				reason: "MASTER_CHANGE_REQUEST_REQUIRED",
			});
		}

		const submitted = await submitChangeRequest(
			{
				...ctx(),
				commandKind: "activate_party",
				payload: { partyId: party.data.id },
			},
			options,
		);
		expect(submitted.ok).toBe(true);
		if (!submitted.ok) {
			return;
		}
		const approved = await approveChangeRequest(
			{
				organizationId: "org-mdg",
				actorUserId: "user-checker",
				correlationId: randomUUID(),
				id: submitted.data.id,
				expectedVersion: submitted.data.version,
			},
			options,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		expect(
			ports.outbox.calls.some(
				(e) => e.type === "master_data.change_request.approved.v1",
			),
		).toBe(true);

		const activated = await activateParty(
			{
				...ctx(),
				id: party.data.id,
				expectedVersion: party.data.version,
				changeRequestId: approved.data.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");
		expect(
			ports.outbox.calls.some(
				(e) => e.type === "master_data.change_request.applied.v1",
			),
		).toBe(true);

		const loaded = await store.getChangeRequestById(
			"org-mdg",
			approved.data.id,
		);
		expect(loaded.ok && loaded.data?.status === "applied").toBe(true);

		const source = await createParty(
			{
				...ctx(),
				code: "MSRC",
				name: "Merge Source",
				partyKind: "organization",
			},
			options,
		);
		const target = await createParty(
			{
				...ctx(),
				code: "MTGT",
				name: "Merge Target",
				partyKind: "organization",
			},
			options,
		);
		expect(source.ok && target.ok).toBe(true);
		if (!source.ok || !target.ok) {
			return;
		}

		const mergeWithoutCr = await mergeParties(
			{
				...ctx(),
				sourcePartyId: source.data.id,
				targetPartyId: target.data.id,
				sourceExpectedVersion: source.data.version,
				targetExpectedVersion: target.data.version,
			},
			options,
		);
		expect(mergeWithoutCr.ok).toBe(false);
		if (!mergeWithoutCr.ok) {
			expect(mergeWithoutCr.details).toMatchObject({
				reason: "MASTER_CHANGE_REQUEST_REQUIRED",
			});
		}

		const mergeSubmitted = await submitChangeRequest(
			{
				...ctx(),
				commandKind: "merge_parties",
				payload: {
					sourcePartyId: source.data.id,
					targetPartyId: target.data.id,
				},
			},
			options,
		);
		expect(mergeSubmitted.ok).toBe(true);
		if (!mergeSubmitted.ok) {
			return;
		}
		const mergeApproved = await approveChangeRequest(
			{
				organizationId: "org-mdg",
				actorUserId: "user-checker",
				correlationId: randomUUID(),
				id: mergeSubmitted.data.id,
				expectedVersion: mergeSubmitted.data.version,
			},
			options,
		);
		expect(mergeApproved.ok).toBe(true);
		if (!mergeApproved.ok) {
			return;
		}

		const merged = await mergeParties(
			{
				...ctx(),
				changeRequestId: mergeApproved.data.id,
				sourcePartyId: source.data.id,
				targetPartyId: target.data.id,
				sourceExpectedVersion: source.data.version,
				targetExpectedVersion: target.data.version,
			},
			options,
		);
		expect(merged.ok).toBe(true);
		if (!merged.ok) {
			return;
		}
		const mergeCr = await store.getChangeRequestById(
			"org-mdg",
			mergeApproved.data.id,
		);
		expect(mergeCr.ok && mergeCr.data?.status === "applied").toBe(true);
	});
});
