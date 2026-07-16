import { requireRole } from "@afenda/auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";

import { DeclarationsPanel } from "@/features/declarations/declarations-panel";
import { listSurveys } from "@/modules/declarations/domain/list-surveys";

/**
 * Declarations feature — client-workspace RSC shell
 * (ARCH-013 · ARCH-024 · ARCH-028 S7.4). Never imports `@afenda/db`.
 * Fail-closed via `requireRole('client')` even if composed outside the layout.
 * UI from `@afenda/ui-system` (ADR-010).
 */
export async function DeclarationsShell() {
	const { orgId } = await requireRole("client");
	const surveys = await listSurveys(orgId);

	return (
		<main className="flex min-h-dvh flex-col gap-6 p-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Client dashboard
				</h1>
				<p className="text-sm text-muted-foreground">
					Declarations surveys for this organization.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Surveys</CardTitle>
					<CardDescription>
						Org-scoped declaration surveys ({surveys.length}).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DeclarationsPanel
						surveys={surveys.map((survey) => ({
							id: survey.id,
							title: survey.title,
							slug: survey.slug,
						}))}
					/>
				</CardContent>
			</Card>
		</main>
	);
}
