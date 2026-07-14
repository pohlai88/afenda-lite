import { requireRole } from "@afenda/auth";

import { listSurveys } from "@/modules/declarations/domain/list-surveys";

/**
 * Declarations feature — client-workspace RSC shell
 * (ARCH-013 · ARCH-024 · ARCH-028 S7.4). Never imports `@afenda/db`.
 * Fail-closed via `requireRole('client')` even if composed outside the layout.
 */
export async function DeclarationsShell() {
	const { orgId } = await requireRole("client");
	const surveys = await listSurveys(orgId);

	return (
		<main className="flex min-h-dvh flex-col gap-6 p-8">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Client dashboard
				</h1>
				<p className="text-muted-foreground">
					Declarations surveys for this organization.
				</p>
			</header>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="surveys-heading"
			>
				<h2 id="surveys-heading" className="text-lg font-medium">
					Surveys ({surveys.length})
				</h2>
				{surveys.length === 0 ? (
					<p className="text-sm text-muted-foreground">No surveys yet.</p>
				) : (
					<ul className="list-inside list-disc text-sm">
						{surveys.map((survey) => (
							<li key={survey.id}>
								{survey.title}{" "}
								<code className="text-muted-foreground">{survey.slug}</code>
							</li>
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
