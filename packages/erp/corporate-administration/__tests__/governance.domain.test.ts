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
				officerAppointmentId: officer.data.id,
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
				effectiveFrom: "2024-06-01",
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
				addressLine1Snapshot: "1 Main Street",
				citySnapshot: "Kuala Lumpur",
				countryCodeSnapshot: "MY",
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
				governanceMeetingId: meeting.data.id,
				resolutionNumber: "001",
				resolutionYear: 2024,
				title: "Approve registered office",
				status: "approved",
				approvedDate: "2024-06-15",
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
});
