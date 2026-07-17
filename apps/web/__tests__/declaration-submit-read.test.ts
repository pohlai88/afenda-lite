/**
 * N17 — Declarations submit/read under hard tenancy.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clientAssignments, db, eq, surveys } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import { saveClientDeclarationDraft } from "../modules/declarations/domain/declaration-draft";
import { getClientDeclaration } from "../modules/declarations/domain/get-client-declaration";
import {
	hasDeclarationAnswerContent,
	submitClientDeclaration,
} from "../modules/declarations/domain/submit-client-declaration";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

function loadDatabaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}
	try {
		const text = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
			const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
			if (!match) continue;
			let value = match[1]?.trim() ?? "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return value.length > 0 ? value : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

const databaseUrl = loadDatabaseUrl();
if (databaseUrl) {
	process.env.DATABASE_URL = databaseUrl;
}

const hasDatabase = typeof databaseUrl === "string" && databaseUrl.length > 0;

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
});
