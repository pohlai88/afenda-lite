import { getApiSession, requireRole } from "@afenda/auth";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	MetricCard,
} from "@afenda/ui-system";
import {
	AlertTriangleIcon,
	CircleCheckIcon,
	ClipboardListIcon,
	FilePenLineIcon,
} from "lucide-react";

import {
	type DeclarationDueState,
	DeclarationsPanel,
} from "@/features/declarations/declarations-panel";
import { isClientOnboardingComplete } from "@/modules/declarations/domain/declaration-draft";
import { listClientAssignments } from "@/modules/declarations/domain/list-client-assignments";

function toIso(value: Date | string | null | undefined): string | null {
	if (value == null) {
		return null;
	}
	if (typeof value === "string") {
		return value;
	}
	return value.toISOString();
}

function resolveDueState(
	submitBefore: Date | string | null | undefined,
): DeclarationDueState {
	if (submitBefore == null) {
		return "none";
	}
	const due = new Date(submitBefore);
	if (Number.isNaN(due.getTime())) {
		return "none";
	}
	return due.getTime() < Date.now() ? "past_due" : "open";
}

/**
 * Declarations feature — client-workspace RSC shell
 * (ARCH-013 · ARCH-024 · ARCH-028 S7.4). Never imports `@afenda/db`.
 * Fail-closed via `requireRole('client')` even if composed outside the layout.
 * UI from `@afenda/ui-system` (ADR-010 · afenda-elite-ui-compose).
 *
 * UI-CAP-07 cleared: listClientAssignments (org+email) + Sheet draft write via
 * server actions mirroring `/api/client/declaration-draft`.
 */
export async function DeclarationsShell() {
	const session = await requireRole("client");
	const apiSession = await getApiSession();
	if (!apiSession) {
		throw new Error(
			"DeclarationsShell: ApiSession missing after requireRole('client')",
		);
	}

	const [assignments, canEditDraft] = await Promise.all([
		listClientAssignments({
			orgId: apiSession.orgId,
			clientEmail: apiSession.email,
		}),
		isClientOnboardingComplete({
			orgId: apiSession.orgId,
			userId: session.userId,
		}),
	]);

	const rows = assignments.map((item) => ({
		assignmentId: item.assignmentId,
		surveyId: item.surveyId,
		title: item.title,
		slug: item.slug,
		question: item.question,
		referenceNumber: item.referenceNumber,
		caseNumber: item.caseNumber,
		effectiveDate: item.effectiveDate,
		submitBefore: toIso(item.submitBefore ?? item.dueDate),
		dueState: resolveDueState(item.submitBefore ?? item.dueDate),
		assignmentStatus: item.status,
		draftSavedAt: toIso(item.draftSavedAt),
		surveyorName: item.surveyorName,
		surveyorOrg: item.surveyorOrg,
		surveyeeOrg: item.surveyeeOrg,
		purpose: item.purpose,
		categories: item.categories,
		createdAt: toIso(item.createdAt) ?? "",
	}));

	const openCount = rows.filter((row) => row.dueState === "open").length;
	const pastDueCount = rows.filter((row) => row.dueState === "past_due").length;
	const draftCount = rows.filter((row) => row.draftSavedAt != null).length;

	return (
		<main className="flex min-h-dvh flex-col gap-(--section-gap) bg-canvas p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Client dashboard
				</h1>
				<p className="text-sm text-foreground-secondary">
					Declaration assignments for{" "}
					<code className="font-mono text-foreground">{apiSession.email}</code>{" "}
					in{" "}
					<code className="font-mono text-foreground">{apiSession.orgId}</code>.
				</p>
			</header>

			<section
				aria-label="Declarations summary"
				className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
			>
				<MetricCard
					title="Assignments"
					value={assignments.length}
					description="Surveys assigned to your email"
					icon={<ClipboardListIcon className="h-4 w-4" />}
					trend="neutral"
				/>
				<MetricCard
					title="Open"
					value={openCount}
					description="Assignments with a future due date"
					icon={<CircleCheckIcon className="h-4 w-4" />}
					trend="neutral"
				/>
				<MetricCard
					title="Past due"
					value={pastDueCount}
					description="Assignments past their due date"
					icon={<AlertTriangleIcon className="h-4 w-4" />}
					trend="neutral"
				/>
			</section>

			{pastDueCount > 0 ? (
				<Alert>
					<AlertTriangleIcon />
					<AlertTitle>Past-due assignments</AlertTitle>
					<AlertDescription>
						{pastDueCount === 1
							? "1 assignment is past its due date."
							: `${pastDueCount} assignments are past their due date.`}{" "}
						Review due dates in the list below
						{canEditDraft ? " or open Respond to save a draft." : "."}
					</AlertDescription>
				</Alert>
			) : null}

			{!canEditDraft ? (
				<Alert>
					<FilePenLineIcon />
					<AlertTitle>Draft editing unavailable</AlertTitle>
					<AlertDescription>
						Complete client onboarding before saving declaration drafts. You can
						still view assignment details.
					</AlertDescription>
				</Alert>
			) : null}

			<Card className="bg-surface-raised">
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="space-y-1.5">
						<CardTitle>Assignments</CardTitle>
						<CardDescription className="text-foreground-tertiary">
							Org-scoped surveys assigned to your client email
							{draftCount > 0 ? ` · ${draftCount} with a saved draft` : null}.
						</CardDescription>
					</div>
					<Badge variant="secondary">{assignments.length} assigned</Badge>
				</CardHeader>
				<CardContent>
					<DeclarationsPanel assignments={rows} canEditDraft={canEditDraft} />
				</CardContent>
			</Card>
		</main>
	);
}
