import { fail } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	appointGovernanceMembership,
	appointOfficer,
	createGovernanceBody,
	getAuthorityMandate,
	getCompanyPremise,
	getGovernanceBody,
	getGovernanceMeeting,
	getGovernanceMembership,
	getOfficerAppointment,
	getResolution,
	grantAuthorityMandate,
	listAuthorityMandates,
	listCompanyPremises,
	listGovernanceBodies,
	listGovernanceMeetings,
	listGovernanceMemberships,
	listOfficerAppointments,
	listResolutions,
	recordGovernanceMeeting,
	recordResolution,
	registerCompanyPremise,
} from "../src/governance";
import {
	amendAuthorityMandate,
	amendOfficer,
	approveResolution,
	closeGovernanceMeeting,
	endGovernanceMembership,
	endOfficer,
	retireCompanyPremise,
	retireGovernanceBody,
	revokeAuthorityMandate,
	revokeResolution,
	updateCompanyPremise,
	updateGovernanceBody,
} from "../src/governance-lifecycle";
import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const ORG_B = "org-b";
const DIM_A = "10000000-0000-4000-8000-000000000001";
const PARTY_A = "20000000-0000-4000-8000-000000000001";
const DIRECTOR_B = "20000000-0000-4000-8000-000000000002";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [
			seedOrganizationParty(ORG_A, PARTY_A, "ORG-A"),
			seedOrganizationParty(ORG_A, DIRECTOR_B, "Director B"),
		],
		countries: [
			{
				id: "30000000-0000-4000-8000-000000000001",
				code: "MY",
				alpha3: "MYS",
				name: "Malaysia",
				active: true,
			},
		],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

async function seedCompany(
	h: ReturnType<typeof harness>,
	code: string,
	idempotencyKey: string,
) {
	const created = await createLegalCompany(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${idempotencyKey}`,
			idempotencyKey,
			requestFingerprint: `fp-${idempotencyKey}`,
			code,
			legalEntityDimensionId: DIM_A,
			legalPartyId: PARTY_A,
		},
		h,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) throw new Error("seed company failed");
	return created.data;
}

describe("@afenda/corporate-administration governance", () => {
	it("creates and lists CA-2 aggregates with tenant isolation", async () => {
		const h = harness();
		const company = await seedCompany(h, "CO-GOV", "gov-co-1");

		const officer = await appointOfficer(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-off-1",
				idempotencyKey: "off-1",
				legalCompanyId: company.id,
				officerRole: "director",
				partyId: DIRECTOR_B,
				appointedDate: "2024-06-01",
			},
			h,
		);
		expect(officer.ok).toBe(true);
		if (!officer.ok) return;

		const body = await createGovernanceBody(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-body-1",
				idempotencyKey: "body-1",
				legalCompanyId: company.id,
				code: "BOARD",
				bodyType: "board",
				displayName: "Board of Directors",
			},
			h,
		);
		expect(body.ok).toBe(true);
		if (!body.ok) return;

		const membership = await appointGovernanceMembership(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-mem-1",
				idempotencyKey: "mem-1",
				legalCompanyId: company.id,
				governanceBodyId: body.data.id,
				subject: {
					kind: "officer",
					officerAppointmentId: officer.data.id,
				},
				roleTitle: "Chair",
				effectiveFrom: "2024-06-01",
			},
			h,
		);
		expect(membership.ok).toBe(true);
		if (!membership.ok) return;

		const mandate = await grantAuthorityMandate(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-man-1",
				idempotencyKey: "man-1",
				legalCompanyId: company.id,
				mandateType: "signing_authority",
				scopeDescription: "Banking signatory",
				signingRule: "single",
				minimumSignatories: 1,
				holders: [
					{
						kind: "officer",
						officerAppointmentId: officer.data.id,
					},
				],
				effectiveFrom: "2024-06-01",
				grantEvidenceReference: "board-minute-2024-01",
			},
			h,
		);
		expect(mandate.ok).toBe(true);
		if (!mandate.ok) return;

		const premise = await registerCompanyPremise(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-pre-1",
				idempotencyKey: "pre-1",
				legalCompanyId: company.id,
				premiseType: "registered_office",
				addressSource: {
					kind: "manual",
					line1: "1 Main Street",
					city: "Kuala Lumpur",
					countryCode: "MY",
				},
				isPrimary: true,
				effectiveFrom: "2024-06-01",
			},
			h,
		);
		expect(premise.ok).toBe(true);
		if (!premise.ok) return;

		const meeting = await recordGovernanceMeeting(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-meet-1",
				idempotencyKey: "meet-1",
				legalCompanyId: company.id,
				mode: "standard",
				governanceBodyId: body.data.id,
				meetingAt: "2024-06-15T09:00:00.000Z",
				quorumResult: "met",
				status: "held",
			},
			h,
		);
		expect(meeting.ok).toBe(true);
		if (!meeting.ok) return;

		const resolution = await recordResolution(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-res-1",
				idempotencyKey: "res-1",
				legalCompanyId: company.id,
				mode: "standard",
				governanceMeetingId: meeting.data.id,
				resolutionNumber: "001",
				resolutionYear: 2024,
				title: "Approve registered office",
			},
			h,
		);
		expect(resolution.ok).toBe(true);
		if (!resolution.ok) return;

		const listedOfficers = await listOfficerAppointments(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedOfficers.ok).toBe(true);
		if (listedOfficers.ok) {
			expect(listedOfficers.data).toHaveLength(1);
		}

		const gotOfficer = await getOfficerAppointment(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: officer.data.id,
			},
			h,
		);
		expect(gotOfficer.ok).toBe(true);

		const listedBodies = await listGovernanceBodies(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedBodies.ok).toBe(true);
		if (listedBodies.ok) expect(listedBodies.data).toHaveLength(1);

		const gotBody = await getGovernanceBody(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: body.data.id,
			},
			h,
		);
		expect(gotBody.ok).toBe(true);

		const listedMemberships = await listGovernanceMemberships(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedMemberships.ok).toBe(true);
		if (listedMemberships.ok) expect(listedMemberships.data).toHaveLength(1);

		const gotMembership = await getGovernanceMembership(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: membership.data.id,
			},
			h,
		);
		expect(gotMembership.ok).toBe(true);

		const listedMandates = await listAuthorityMandates(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedMandates.ok).toBe(true);
		if (listedMandates.ok) expect(listedMandates.data).toHaveLength(1);

		const gotMandate = await getAuthorityMandate(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: mandate.data.id,
			},
			h,
		);
		expect(gotMandate.ok).toBe(true);

		const listedPremises = await listCompanyPremises(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedPremises.ok).toBe(true);
		if (listedPremises.ok) expect(listedPremises.data).toHaveLength(1);

		const gotPremise = await getCompanyPremise(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: premise.data.id,
			},
			h,
		);
		expect(gotPremise.ok).toBe(true);

		const listedMeetings = await listGovernanceMeetings(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedMeetings.ok).toBe(true);
		if (listedMeetings.ok) expect(listedMeetings.data).toHaveLength(1);

		const gotMeeting = await getGovernanceMeeting(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: meeting.data.id,
			},
			h,
		);
		expect(gotMeeting.ok).toBe(true);

		const listedResolutions = await listResolutions(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listedResolutions.ok).toBe(true);
		if (listedResolutions.ok) expect(listedResolutions.data).toHaveLength(1);

		const gotResolution = await getResolution(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: resolution.data.id,
			},
			h,
		);
		expect(gotResolution.ok).toBe(true);

		const foreign = await getOfficerAppointment(
			{
				organizationId: ORG_B,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				id: officer.data.id,
			},
			h,
		);
		expect(foreign.ok).toBe(false);
		if (!foreign.ok) expect(foreign.code).toBe("NOT_FOUND");
	});

	it("executes all CA-2 lifecycle commands with CAS and immutable history", async () => {
		const h = harness();
		const company = await seedCompany(h, "CO-LIFE", "life-co-1");
		const base = (key: string) => ({
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-${key}`,
			idempotencyKey: key,
			legalCompanyId: company.id,
		});

		const officer = await appointOfficer(
			{
				...base("life-officer"),
				officerRole: "director",
				partyId: DIRECTOR_B,
				appointedDate: "2024-01-01",
			},
			h,
		);
		expect(officer.ok).toBe(true);
		if (!officer.ok) return;
		const amendedOfficer = await amendOfficer(
			{
				...base("life-officer-amend"),
				id: officer.data.id,
				expectedVersion: officer.data.version,
				reason: "Authority expanded",
				effectiveFrom: "2024-06-01",
				authorityLimits: "Up to policy limit",
			},
			h,
		);
		expect(amendedOfficer.ok).toBe(true);
		if (!amendedOfficer.ok) return;
		const endedOfficer = await endOfficer(
			{
				...base("life-officer-end"),
				id: amendedOfficer.data.id,
				expectedVersion: amendedOfficer.data.version,
				reason: "Resigned",
				effectiveTo: "2024-12-31",
				endKind: "resigned",
				evidenceReference: "resignation-letter",
			},
			h,
		);
		expect(endedOfficer.ok && endedOfficer.data.status === "resigned").toBe(
			true,
		);

		const body = await createGovernanceBody(
			{
				...base("life-body"),
				code: "AUDIT",
				bodyType: "committee",
				displayName: "Audit Committee",
			},
			h,
		);
		expect(body.ok).toBe(true);
		if (!body.ok) return;
		const updatedBody = await updateGovernanceBody(
			{
				...base("life-body-update"),
				id: body.data.id,
				expectedVersion: body.data.version,
				reason: "Charter update",
				displayName: "Audit and Risk Committee",
			},
			h,
		);
		expect(updatedBody.ok).toBe(true);
		if (!updatedBody.ok) return;

		const membership = await appointGovernanceMembership(
			{
				...base("life-membership"),
				governanceBodyId: body.data.id,
				subject: { kind: "party", partyId: DIRECTOR_B },
				roleTitle: "Member",
				effectiveFrom: "2024-01-01",
			},
			h,
		);
		expect(membership.ok).toBe(true);
		if (!membership.ok) return;
		const endedMembership = await endGovernanceMembership(
			{
				...base("life-membership-end"),
				id: membership.data.id,
				expectedVersion: membership.data.version,
				reason: "Term completed",
				effectiveTo: "2024-12-31",
			},
			h,
		);
		expect(endedMembership.ok).toBe(true);

		const mandate = await grantAuthorityMandate(
			{
				...base("life-mandate"),
				mandateType: "signing_authority",
				scopeDescription: "Contracts",
				signingRule: "single",
				minimumSignatories: 1,
				holders: [{ kind: "party", partyId: DIRECTOR_B }],
				effectiveFrom: "2024-01-01",
				grantEvidenceReference: "resolution-1",
			},
			h,
		);
		expect(mandate.ok).toBe(true);
		if (!mandate.ok) return;
		const amendedMandate = await amendAuthorityMandate(
			{
				...base("life-mandate-amend"),
				id: mandate.data.id,
				expectedVersion: mandate.data.version,
				reason: "Joint control",
				effectiveFrom: "2024-07-01",
				mandateType: "signing_authority",
				scopeDescription: "Contracts and banking",
				signingRule: "joint",
				minimumSignatories: 2,
				holders: [
					{ kind: "party", partyId: DIRECTOR_B },
					{ kind: "party", partyId: PARTY_A },
				],
				grantEvidenceReference: "resolution-2",
			},
			h,
		);
		expect(amendedMandate.ok).toBe(true);
		if (!amendedMandate.ok) return;
		const revokedMandate = await revokeAuthorityMandate(
			{
				...base("life-mandate-revoke"),
				id: amendedMandate.data.id,
				expectedVersion: amendedMandate.data.version,
				reason: "Authority withdrawn",
				effectiveTo: "2024-12-31",
				evidenceReference: "resolution-3",
			},
			h,
		);
		expect(revokedMandate.ok).toBe(true);

		const premise = await registerCompanyPremise(
			{
				...base("life-premise"),
				premiseType: "registered_office",
				addressSource: {
					kind: "manual",
					line1: "1 Old Street",
					city: "Kuala Lumpur",
					countryCode: "MY",
				},
				isPrimary: true,
				effectiveFrom: "2024-01-01",
			},
			h,
		);
		expect(premise.ok).toBe(true);
		if (!premise.ok) return;
		const updatedPremise = await updateCompanyPremise(
			{
				...base("life-premise-update"),
				id: premise.data.id,
				expectedVersion: premise.data.version,
				reason: "Office moved",
				effectiveFrom: "2024-08-01",
				premiseType: "registered_office",
				addressSource: {
					kind: "manual",
					line1: "2 New Street",
					city: "Kuala Lumpur",
					countryCode: "MY",
				},
				isPrimary: true,
			},
			h,
		);
		expect(updatedPremise.ok).toBe(true);
		if (!updatedPremise.ok) return;
		const retiredPremise = await retireCompanyPremise(
			{
				...base("life-premise-retire"),
				id: updatedPremise.data.id,
				expectedVersion: updatedPremise.data.version,
				reason: "Location closed",
				effectiveTo: "2024-12-31",
			},
			h,
		);
		expect(retiredPremise.ok).toBe(true);

		const meeting = await recordGovernanceMeeting(
			{
				...base("life-meeting"),
				mode: "standard",
				governanceBodyId: body.data.id,
				meetingAt: "2024-09-01T09:00:00.000Z",
				status: "held",
				quorumResult: "met",
			},
			h,
		);
		expect(meeting.ok).toBe(true);
		if (!meeting.ok) return;
		const closedMeeting = await closeGovernanceMeeting(
			{
				...base("life-meeting-close"),
				id: meeting.data.id,
				expectedVersion: meeting.data.version,
				reason: "Minutes finalized",
				quorumResult: "met",
				minutesDocumentReference: "minutes-2024-09",
			},
			h,
		);
		expect(closedMeeting.ok).toBe(true);

		const resolution = await recordResolution(
			{
				...base("life-resolution"),
				mode: "standard",
				governanceMeetingId: meeting.data.id,
				resolutionNumber: "L-001",
				resolutionYear: 2024,
				title: "Approve annual plan",
			},
			h,
		);
		expect(resolution.ok).toBe(true);
		if (!resolution.ok) return;
		const approved = await approveResolution(
			{
				...base("life-resolution-approve"),
				id: resolution.data.id,
				expectedVersion: resolution.data.version,
				reason: "Board approved",
				approvedDate: "2024-09-01",
				evidenceReference: "minutes-2024-09",
			},
			h,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		const revoked = await revokeResolution(
			{
				...base("life-resolution-revoke"),
				id: approved.data.id,
				expectedVersion: approved.data.version,
				reason: "Reconsidered",
				revokedDate: "2024-10-01",
				evidenceReference: "minutes-2024-10",
			},
			h,
		);
		expect(revoked.ok).toBe(true);

		const retiredBody = await retireGovernanceBody(
			{
				...base("life-body-retire"),
				id: updatedBody.data.id,
				expectedVersion: updatedBody.data.version,
				reason: "Committee dissolved",
			},
			h,
		);
		expect(retiredBody.ok).toBe(true);

		const staleBody = await updateGovernanceBody(
			{
				...base("life-body-stale"),
				id: body.data.id,
				expectedVersion: body.data.version,
				reason: "Stale request",
				displayName: "Must not apply",
			},
			h,
		);
		expect(staleBody.ok).toBe(false);
	});

	it("replays idempotent officer appointment creates", async () => {
		const h = harness();
		const company = await seedCompany(h, "CO-IDEM", "gov-co-2");
		const input = {
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: "corr-off-2",
			idempotencyKey: "off-idem",
			legalCompanyId: company.id,
			officerRole: "secretary" as const,
			partyId: DIRECTOR_B,
			appointedDate: "2024-07-01",
		};
		const first = await appointOfficer(input, h);
		const second = await appointOfficer(input, h);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (first.ok && second.ok) {
			expect(second.data.id).toBe(first.data.id);
		}
	});

	it("does not mutate officer appointment when atomic mutation facts fail", async () => {
		const h = harness();
		const company = await seedCompany(h, "CO-FI", "gov-co-fi");
		const failingPorts = {
			...h.ports,
			async record() {
				return fail("INTERNAL_ERROR", "Injected outbox failure");
			},
		};
		const appointed = await appointOfficer(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-fi-off",
				idempotencyKey: "off-fi",
				legalCompanyId: company.id,
				officerRole: "director",
				partyId: DIRECTOR_B,
				appointedDate: "2024-08-01",
			},
			{ ...h, ports: failingPorts },
		);
		expect(appointed.ok).toBe(false);

		const listed = await listOfficerAppointments(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			h,
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(0);
		}
	});
});
