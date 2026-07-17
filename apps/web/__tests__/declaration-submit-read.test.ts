/**
 * N17 — Declarations submit/read under hard tenancy.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import { randomUUID } from "node:crypto";
import { clientAssignments, db, eq, surveys } from "@afenda/db";
import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";
import {
	getClientDeclarationDraft,
	saveClientDeclarationDraft,
} from "../modules/declarations/domain/declaration-draft";
import { getClientDeclaration } from "../modules/declarations/domain/get-client-declaration";
import {
	hasDeclarationAnswerContent,
	submitClientDeclaration,
} from "../modules/declarations/domain/submit-client-declaration";

const { hasDatabase } = resolveDatabaseUrlForTests();

describe("declaration submit/read guards (N17)", () => {
	it("hasDeclarationAnswerContent rejects empty answer maps", () => {
		expect(hasDeclarationAnswerContent({})).toBe(false);
		expect(hasDeclarationAnswerContent({ [randomUUID()]: "  " })).toBe(false);
		expect(hasDeclarationAnswerContent({ [randomUUID()]: "yes" })).toBe(true);
		expect(hasDeclarationAnswerContent({ [randomUUID()]: true })).toBe(true);
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

describe.skipIf(!hasDatabase)("declaration submit/read two-org (N17)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-n17-iso-a-${runId}`;
	const orgB = `org-n17-iso-b-${runId}`;
	const clientEmail = `n17-iso-${runId}@example.com`;
	const surveyIds: string[] = [];
	const assignmentIds: string[] = [];

	afterAll(async () => {
		for (const id of assignmentIds) {
			await db.delete(clientAssignments).where(eq(clientAssignments.id, id));
		}
		for (const id of surveyIds) {
			await db.delete(surveys).where(eq(surveys.id, id));
		}
	});

	it("submit/read under org A; org B cannot read or submit", async () => {
		const actorId = randomUUID();
		const surveyQuestionId = randomUUID();
		const [survey] = await db
			.insert(surveys)
			.values({
				slug: `n17-iso-${runId}`,
				title: "N17 submit survey",
				question: "Finalize?",
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

		const emptySubmit = await submitClientDeclaration({
			orgId: orgA,
			clientEmail,
			assignmentId: assignment.id,
		});
		expect(emptySubmit).toEqual({ ok: false, reason: "empty_answers" });

		const saved = await saveClientDeclarationDraft({
			orgId: orgA,
			clientEmail,
			draft: {
				assignmentId: assignment.id,
				answers: { [surveyQuestionId]: "Declared under org A" },
				stepIndex: 0,
			},
		});
		expect(saved.ok).toBe(true);

		// I5.1 / N17 — peer org cannot draft-get or draft-save by assignment id
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

		const first = await submitClientDeclaration({
			orgId: orgA,
			clientEmail,
			assignmentId: assignment.id,
		});
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.status).toBe("submitted");
		expect(first.data.idempotent).toBe(false);
		expect(first.data.confirmationCode.length).toBeGreaterThan(0);

		const second = await submitClientDeclaration({
			orgId: orgA,
			clientEmail,
			assignmentId: assignment.id,
		});
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data.idempotent).toBe(true);
		expect(second.data.confirmationCode).toBe(first.data.confirmationCode);

		const locked = await saveClientDeclarationDraft({
			orgId: orgA,
			clientEmail,
			draft: {
				assignmentId: assignment.id,
				answers: { [surveyQuestionId]: "should not stick" },
				stepIndex: 1,
			},
		});
		expect(locked).toEqual({ ok: false, reason: "locked" });

		const owned = await getClientDeclaration({
			orgId: orgA,
			clientEmail,
			assignmentId: assignment.id,
		});
		expect(owned).toMatchObject({
			assignmentId: assignment.id,
			status: "submitted",
			confirmationCode: first.data.confirmationCode,
			answers: { [surveyQuestionId]: "Declared under org A" },
		});

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

	it("draft save stays locked when status is already submitted (UPDATE WHERE)", async () => {
		const actorId = randomUUID();
		const surveyQuestionId = randomUUID();
		const [survey] = await db
			.insert(surveys)
			.values({
				slug: `n17-lock-${runId}`,
				title: "N17 lock survey",
				question: "Locked?",
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

		const originalAnswer = "Original draft before finalize";
		const saved = await saveClientDeclarationDraft({
			orgId: orgA,
			clientEmail,
			draft: {
				assignmentId: assignment.id,
				answers: { [surveyQuestionId]: originalAnswer },
				stepIndex: 0,
			},
		});
		expect(saved.ok).toBe(true);

		await db
			.update(clientAssignments)
			.set({
				status: "submitted",
				confirmationCode: randomUUID(),
			})
			.where(eq(clientAssignments.id, assignment.id));

		const locked = await saveClientDeclarationDraft({
			orgId: orgA,
			clientEmail,
			draft: {
				assignmentId: assignment.id,
				answers: { [surveyQuestionId]: "must not overwrite submitted" },
				stepIndex: 2,
			},
		});
		expect(locked).toEqual({ ok: false, reason: "locked" });

		const owned = await getClientDeclaration({
			orgId: orgA,
			clientEmail,
			assignmentId: assignment.id,
		});
		expect(owned).toMatchObject({
			assignmentId: assignment.id,
			status: "submitted",
			answers: { [surveyQuestionId]: originalAnswer },
			stepIndex: 0,
		});
	});

	it("concurrent double-submit race yields one confirmation (I4 A10)", async () => {
		const actorId = randomUUID();
		const surveyQuestionId = randomUUID();
		const [survey] = await db
			.insert(surveys)
			.values({
				slug: `n17-race-${runId}`,
				title: "N17 race survey",
				question: "Race?",
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
				answers: { [surveyQuestionId]: "Concurrent finalize" },
				stepIndex: 0,
			},
		});
		expect(saved.ok).toBe(true);

		const [first, second] = await Promise.all([
			submitClientDeclaration({
				orgId: orgA,
				clientEmail,
				assignmentId: assignment.id,
			}),
			submitClientDeclaration({
				orgId: orgA,
				clientEmail,
				assignmentId: assignment.id,
			}),
		]);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) {
			return;
		}
		expect(first.data.confirmationCode).toBe(second.data.confirmationCode);
		expect(first.data.status).toBe("submitted");
		expect(second.data.status).toBe("submitted");
		expect(first.data.idempotent || second.data.idempotent).toBe(true);
	});
});
