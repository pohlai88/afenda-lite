import { getApiSession, requireRole } from "@afenda/auth";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	KeyValueList,
	StatusBadge,
} from "@afenda/ui-system";
import { ArrowLeftIcon, FilePenLineIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { forbidPermissionAccess } from "@/features/auth/require-permission";
import { SubmitDeclarationForm } from "@/features/declarations/submit-declaration-form";
import { isClientOnboardingComplete } from "@/modules/declarations/domain/declaration-draft";
import { getClientDeclaration } from "@/modules/declarations/domain/get-client-declaration";
import { SUBMITTED_ASSIGNMENT_STATUS } from "@/modules/declarations/domain/submit-client-declaration";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

function formatDate(value: string | null): string {
	if (!value) {
		return "—";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function answerDisplay(answers: Record<string, boolean | string>): string {
	const values = Object.values(answers);
	if (values.length === 0) {
		return "—";
	}
	return values
		.map((value) => {
			if (typeof value === "boolean") {
				return value ? "true" : "false";
			}
			return value.trim().length > 0 ? value : "—";
		})
		.join("\n");
}

type DeclarationDetailShellProps = {
	assignmentId: string;
};

/**
 * Declarations feature — owned assignment read + submit (N17).
 * Never imports `@afenda/db`. UI from `@afenda/ui-system` (ADR-010).
 */
export async function DeclarationDetailShell({
	assignmentId,
}: DeclarationDetailShellProps) {
	const session = await requireRole("client");
	const apiSession = await getApiSession();
	if (!apiSession) {
		throw new Error(
			"DeclarationDetailShell: ApiSession missing after requireRole('client')",
		);
	}

	const [canReadDeclarations, canManageDeclarations] = await Promise.all([
		sessionHasPermission(session, "declarations.read"),
		sessionHasPermission(session, "declarations.manage"),
	]);
	if (!canReadDeclarations) {
		forbidPermissionAccess();
	}

	const [declaration, onboardingComplete] = await Promise.all([
		getClientDeclaration({
			orgId: apiSession.orgId,
			clientEmail: apiSession.email,
			assignmentId,
		}),
		isClientOnboardingComplete({
			orgId: apiSession.orgId,
			userId: session.userId,
		}),
	]);

	if (!declaration) {
		notFound();
	}

	const isSubmitted = declaration.status === SUBMITTED_ASSIGNMENT_STATUS;
	const canSubmit = onboardingComplete && canManageDeclarations && !isSubmitted;
	const hasAnswers = Object.values(declaration.answers).some((value) => {
		if (typeof value === "boolean") {
			return true;
		}
		return value.trim().length > 0;
	});

	return (
		<main className="flex min-h-dvh flex-col gap-(--section-gap) bg-canvas p-6">
			<header className="flex flex-col gap-3">
				<Button asChild variant="ghost" size="sm" className="w-fit px-0">
					<Link href="/client/declarations">
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						Back to assignments
					</Link>
				</Button>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight">
							{declaration.title}
						</h1>
						<p className="text-sm text-foreground-secondary">
							Owned declaration for{" "}
							<code className="font-mono text-foreground">
								{apiSession.email}
							</code>
							.
						</p>
					</div>
					<Badge variant="secondary">{declaration.status}</Badge>
				</div>
			</header>

			{!canManageDeclarations || !onboardingComplete ? (
				<Alert>
					<FilePenLineIcon />
					<AlertTitle>Submit unavailable</AlertTitle>
					<AlertDescription>
						{onboardingComplete
							? "Your assigned role does not include declaration editing."
							: "Complete client onboarding before submitting this declaration."}
					</AlertDescription>
				</Alert>
			) : null}

			<section className="grid gap-6 lg:grid-cols-2">
				<Card className="bg-surface-raised">
					<CardHeader>
						<CardTitle>Assignment</CardTitle>
						<CardDescription className="text-foreground-tertiary">
							Survey metadata scoped to your organization.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<KeyValueList
							size="sm"
							items={[
								{
									label: "Assignment ID",
									value: <Code>{declaration.assignmentId}</Code>,
								},
								{
									label: "Slug",
									value: <Code>{declaration.slug}</Code>,
								},
								{
									label: "Status",
									value: (
										<StatusBadge
											status={isSubmitted ? "active" : "inactive"}
											label={declaration.status}
										/>
									),
								},
								{
									label: "Confirmation",
									value: declaration.confirmationCode ? (
										<Code>{declaration.confirmationCode}</Code>
									) : (
										"—"
									),
								},
								{
									label: "Reference",
									value: declaration.referenceNumber ?? "—",
								},
								{
									label: "Case",
									value: declaration.caseNumber ?? "—",
								},
								{
									label: "Due",
									value: formatDate(
										declaration.submitBefore ?? declaration.dueDate,
									),
								},
								{
									label: "Draft saved",
									value: formatDate(declaration.draftSavedAt),
								},
								{
									label: "Question",
									value: declaration.question,
								},
								{
									label: "Purpose",
									value: declaration.purpose ?? "—",
								},
								{
									label: "Surveyor",
									value:
										[declaration.surveyorName, declaration.surveyorOrg]
											.filter(Boolean)
											.join(" · ") || "—",
								},
								{
									label: "Categories",
									value:
										declaration.categories.length > 0
											? declaration.categories.join(", ")
											: "—",
								},
							]}
						/>
					</CardContent>
				</Card>

				<Card className="bg-surface-raised">
					<CardHeader>
						<CardTitle>Response</CardTitle>
						<CardDescription className="text-foreground-tertiary">
							{isSubmitted
								? "Submitted answers are locked for this assignment."
								: "Review your draft answers, then submit to finalize."}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-(--section-gap)">
						<pre className="whitespace-pre-wrap rounded-md border border-border bg-canvas p-3 text-sm text-foreground">
							{answerDisplay(declaration.answers)}
						</pre>

						{canSubmit ? (
							hasAnswers ? (
								<SubmitDeclarationForm
									assignmentId={declaration.assignmentId}
								/>
							) : (
								<p className="text-sm text-foreground-secondary">
									Save a draft response from the assignments list before
									submitting.
								</p>
							)
						) : null}

						{isSubmitted && declaration.confirmationCode ? (
							<p className="text-sm text-foreground-secondary">
								Confirmation code{" "}
								<code className="font-mono text-foreground">
									{declaration.confirmationCode}
								</code>
							</p>
						) : null}
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
