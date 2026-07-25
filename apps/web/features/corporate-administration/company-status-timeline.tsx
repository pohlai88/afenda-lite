import type { CaCompanyStatusHistory } from "@afenda/corporate-administration";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Empty,
} from "@afenda/ui-system";

export function CompanyStatusTimeline({
	history,
}: {
	history: readonly CaCompanyStatusHistory[];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Status history</CardTitle>
				<CardDescription>
					Effective-dated lifecycle evidence in chronological order.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{history.length === 0 ? (
					<Empty
						title="No lifecycle transitions"
						description="The company remains in its initial draft state."
						size="sm"
					/>
				) : (
					<ol className="space-y-4" aria-label="Company status history">
						{history.map((entry) => (
							<li
								key={entry.id}
								className="border-l-2 border-border pl-4 text-sm"
							>
								<p className="font-medium">
									{entry.fromStatus ?? "created"} → {entry.toStatus}
								</p>
								<p className="text-foreground-secondary">
									{entry.effectiveAt.toISOString().slice(0, 10)}
									{entry.reason ? ` · ${entry.reason}` : ""}
								</p>
							</li>
						))}
					</ol>
				)}
			</CardContent>
		</Card>
	);
}
