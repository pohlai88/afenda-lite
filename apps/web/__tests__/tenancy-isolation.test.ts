/**
 * N9 / ARCH-023 — two-org isolation for living tenant adapters.
 *
 * Integration cases need `DATABASE_URL` (runner env or `.env.local`).
 * Fixtures use synthetic org ids and are deleted in afterAll.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { afterAll, describe, expect, it } from "vitest";

import { getClientDeclaration } from "../modules/declarations/domain/get-client-declaration";
import { listClientAssignments } from "../modules/declarations/domain/list-client-assignments";
import { submitClientDeclaration } from "../modules/declarations/domain/submit-client-declaration";
import { listEvents } from "../modules/fft/domain/list-events";
import {
	deleteRbacAuditRow,
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "../modules/platform/domain/record-rbac-audit";

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
