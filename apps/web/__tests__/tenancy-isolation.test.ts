/**
 * N9 / ARCH-023 — two-org isolation for living tenant adapters.
 * GUIDE-018 I5.1 — by-id get/draft/save/submit denial under peer org.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import { randomUUID } from "node:crypto";
import {
	and,
	clientAssignments,
	db,
	eq,
	fftEvent,
	platformRbacAudit,
	surveys,
	withOrg,
} from "@afenda/db";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import {
	getClientDeclarationDraft,
	saveClientDeclarationDraft,
} from "../modules/declarations/domain/declaration-draft";
import { getClientDeclaration } from "../modules/declarations/domain/get-client-declaration";
import { listClientAssignments } from "../modules/declarations/domain/list-client-assignments";
import { submitClientDeclaration } from "../modules/declarations/domain/submit-client-declaration";
import { listEvents } from "../modules/fft/domain/list-events";
import {
	deleteRbacAuditRow,
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "../modules/platform/domain/record-rbac-audit";

const { hasDatabase } = resolveDatabaseUrlForTests();

describe("tenancy isolation guards (N9)", () => {
	it("withOrg rejects empty orgId", async () => {
		await expect(withOrg(platformRbacAudit, "  ")).rejects.toThrow(
			/non-empty orgId/,
		);
	});

	it("listEvents rejects empty orgId via withOrg", async () => {
		await expect(listEvents("")).rejects.toThrow(/non-empty orgId/);
	});

	it("listClientAssignments returns [] for empty orgId without querying peers", async () => {
		const rows = await listClientAssignments({
			orgId: "   ",
			clientEmail: "client@example.com",
		});
		expect(rows).toEqual([]);
	});

	it("getClientDeclaration returns null for empty orgId", async () => {
		await expect(
			getClientDeclaration({
				orgId: "   ",
				clientEmail: "client@example.com",
				assignmentId: randomUUID(),
			}),
		).resolves.toBeNull();
	});

	it("submitClientDeclaration fails closed for empty orgId", async () => {
		await expect(
			submitClientDeclaration({
				orgId: "",
				clientEmail: "client@example.com",
				assignmentId: randomUUID(),
			}),
		).resolves.toEqual({ ok: false, reason: "not_found" });
	});
});

describe.skipIf(!hasDatabase)("tenancy isolation two-org (N9)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-n9-iso-a-${runId}`;
	const orgB = `org-n9-iso-b-${runId}`;
	const clientEmail = `n9-iso-${runId}@example.com`;

	const auditIds: Array<{ id: string; orgId: string }> = [];
	const surveyIds: string[] = [];
	const assignmentIds: string[] = [];
	const eventIds: string[] = [];

	afterAll(async () => {
		for (const row of auditIds) {
			await deleteRbacAuditRow(row);
		}
		for (const id of assignmentIds) {
			await db.delete(clientAssignments).where(eq(clientAssignments.id, id));
		}
		for (const id of surveyIds) {
			await db.delete(surveys).where(eq(surveys.id, id));
		}
		for (const id of eventIds) {
			await db.delete(fftEvent).where(eq(fftEvent.id, id));
		}
	});

	it("RBAC audit: withOrg A sees row; withOrg B does not", async () => {
		const row = await recordRbacAudit({
			orgId: orgA,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: `user-n9-iso-${runId}`,
			targetType: "membership",
			targetId: clientEmail,
			correlationId: "test-correlation-id",
		});
		auditIds.push({ id: row.id, orgId: orgA });

		const forA = await withOrg(platformRbacAudit, orgA);
		expect(forA.some((item) => item.id === row.id)).toBe(true);

		const forB = await withOrg(platformRbacAudit, orgB);
		expect(forB.some((item) => item.id === row.id)).toBe(false);
	});

	it("declarations: assignment under A is invisible to list under B", async () => {
		const actorId = randomUUID();
		const [survey] = await db
			.insert(surveys)
			.values({
				slug: `n9-iso-${runId}`,
				title: "N9 isolation survey",
				question: "Isolation?",
				userId: actorId,
				organizationId: orgA,
				categories: [],
			})
			.returning({ id: surveys.id });
		if (!survey) {
			throw new Error("survey insert failed");
		}
		surveyIds.push(survey.id);

		const [assignment] = await db
			.insert(clientAssignments)
			.values({
				surveyId: survey.id,
				clientEmail,
				assignedBy: actorId,
				organizationId: orgA,
				status: "pending",
			})
			.returning({ id: clientAssignments.id });
		if (!assignment) {
			throw new Error("assignment insert failed");
		}
		assignmentIds.push(assignment.id);

		const forA = await listClientAssignments({
			orgId: orgA,
			clientEmail,
		});
		expect(forA.some((row) => row.assignmentId === assignment.id)).toBe(true);

		const forB = await listClientAssignments({
			orgId: orgB,
			clientEmail,
		});
		expect(forB.some((row) => row.assignmentId === assignment.id)).toBe(false);

		// Cross-org survey join leak: assignment stamped A must not surface via B
		// even if a hypothetical unscoped join existed — double-eq keeps B empty.
		const leaked = await db
			.select({ id: clientAssignments.id })
			.from(clientAssignments)
			.innerJoin(surveys, eq(clientAssignments.surveyId, surveys.id))
			.where(
				and(
					eq(clientAssignments.organizationId, orgB),
					eq(surveys.organizationId, orgB),
					eq(clientAssignments.id, assignment.id),
				),
			);
		expect(leaked).toHaveLength(0);
	});

	it("I5.1: orgB cannot get/draft/save/submit orgA assignment by id", async () => {
		const actorId = randomUUID();
		const surveyQuestionId = randomUUID();
		const [survey] = await db
			.insert(surveys)
			.values({
				slug: `n9-i51-${runId}`,
				title: "I5.1 by-id isolation survey",
				question: "By id?",
				userId: actorId,
				organizationId: orgA,
				categories: [],
			})
			.returning({ id: surveys.id });
		if (!survey) {
			throw new Error("survey insert failed");
		}
		surveyIds.push(survey.id);

		const [assignment] = await db
			.insert(clientAssignments)
			.values({
				surveyId: survey.id,
				clientEmail,
				assignedBy: actorId,
				organizationId: orgA,
				status: "pending",
			})
			.returning({ id: clientAssignments.id });
		if (!assignment) {
			throw new Error("assignment insert failed");
		}
		assignmentIds.push(assignment.id);

		const saved = await saveClientDeclarationDraft({
			orgId: orgA,
			clientEmail,
			draft: {
				assignmentId: assignment.id,
				answers: { [surveyQuestionId]: "owned by org A" },
				stepIndex: 0,
			},
		});
		expect(saved.ok).toBe(true);

		await expect(
			getClientDeclarationDraft({
				orgId: orgB,
				clientEmail,
				assignmentId: assignment.id,
			}),
		).resolves.toBeNull();

		await expect(
			saveClientDeclarationDraft({
				orgId: orgB,
				clientEmail,
				draft: {
					assignmentId: assignment.id,
					answers: { [surveyQuestionId]: "peer write must fail" },
					stepIndex: 1,
				},
			}),
		).resolves.toEqual({ ok: false, reason: "not_found" });

		await expect(
			getClientDeclaration({
				orgId: orgB,
				clientEmail,
				assignmentId: assignment.id,
			}),
		).resolves.toBeNull();

		await expect(
			submitClientDeclaration({
				orgId: orgB,
				clientEmail,
				assignmentId: assignment.id,
			}),
		).resolves.toEqual({ ok: false, reason: "not_found" });
	});

	it("FFT listEvents: event under A is invisible to org B", async () => {
		const opensAt = new Date();
		const closesAt = new Date(opensAt.getTime() + 86_400_000);
		const [event] = await db
			.insert(fftEvent)
			.values({
				eventCode: `N9ISO${runId}`,
				eventName: "N9 isolation event",
				opensAt,
				closesAt,
				createdBy: randomUUID(),
				organizationId: orgA,
			})
			.returning({ id: fftEvent.id });
		if (!event) {
			throw new Error("fft_event insert failed");
		}
		eventIds.push(event.id);

		const forA = await listEvents(orgA);
		expect(forA.some((row) => row.id === event.id)).toBe(true);

		const forB = await listEvents(orgB);
		expect(forB.some((row) => row.id === event.id)).toBe(false);
	});
});
