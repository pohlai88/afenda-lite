import { requireRole } from "@afenda/auth";
import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	MetricCard,
} from "@afenda/ui-system";
import { ClipboardListIcon } from "lucide-react";

import {
	type DeclarationDueState,
	DeclarationsPanel,
} from "@/features/declarations/declarations-panel";
import { listSurveys } from "@/modules/declarations/domain/list-surveys";

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
 */
export async function DeclarationsShell() {
	const { orgId } = await requireRole("client");
	const surveys = await listSurveys(orgId);

	const rows = surveys.map((survey) => ({
		id: survey.id,
		title: survey.title,
		slug: survey.slug,
		question: survey.question,
		referenceNumber: survey.referenceNumber,
		caseNumber: survey.caseNumber,
		effectiveDate:
			survey.effectiveDate == null ? null : String(survey.effectiveDate),
		submitBefore: toIso(survey.submitBefore),
		dueState: resolveDueState(survey.submitBefore),
		surveyorName: survey.surveyorName,
		surveyorOrg: survey.surveyorOrg,
		surveyeeOrg: survey.surveyeeOrg,
		purpose: survey.purpose,
		categories: survey.categories ?? [],
		createdAt: toIso(survey.createdAt) ?? "",
	}));

	return (
		<main className="flex min-h-dvh flex-col gap-[var(--section-gap)] p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Client dashboard
				</h1>
				<p className="text-sm text-muted-foreground">
					Declarations surveys for{" "}
					<code className="font-mono text-foreground">{orgId}</code>.
				</p>
			</header>

			<section
				aria-label="Declarations summary"
				className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
			>
				<MetricCard
					title="Surveys"
					value={surveys.length}
					description="Org-scoped declaration surveys"
					icon={<ClipboardListIcon className="h-4 w-4" />}
					trend="neutral"
				/>
			</section>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="space-y-1.5">
						<CardTitle>Surveys</CardTitle>
						<CardDescription>
							Published declaration surveys for this organization.
						</CardDescription>
					</div>
					<Badge variant="secondary">{surveys.length} surveys</Badge>
				</CardHeader>
				<CardContent>
					<DeclarationsPanel surveys={rows} />
				</CardContent>
			</Card>
		</main>
	);
}
