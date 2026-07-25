import type { CaLegalCompanyDetail } from "@afenda/corporate-administration";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Empty,
} from "@afenda/ui-system";

export function CompanyIdentifiersPanel({
	company,
}: {
	company: CaLegalCompanyDetail;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Registration</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<section aria-labelledby="company-names-heading">
					<h3 id="company-names-heading" className="mb-3 text-sm font-medium">
						Names
					</h3>
					{company.names.length === 0 ? (
						<Empty
							title="No company names"
							description="Add the effective legal name before activation."
							size="sm"
						/>
					) : (
						<ul className="space-y-2 text-sm">
							{company.names.map((name) => (
								<li key={name.id}>
									<span className="font-medium">{name.displayName}</span>
									<span className="text-foreground-secondary">
										{" "}
										· {name.nameType} · {name.effectiveFrom}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
				<section aria-labelledby="company-identifiers-heading">
					<h3
						id="company-identifiers-heading"
						className="mb-3 text-sm font-medium"
					>
						Identifiers
					</h3>
					{company.identifiers.length === 0 ? (
						<Empty
							title="No company identifiers"
							description="Add the corporate registration identifier before activation."
							size="sm"
						/>
					) : (
						<ul className="space-y-2 text-sm">
							{company.identifiers.map((identifier) => (
								<li key={identifier.id}>
									<span className="font-medium">
										{identifier.identifierValue}
									</span>
									<span className="text-foreground-secondary">
										{" "}
										· {identifier.identifierType} · {identifier.status}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</CardContent>
		</Card>
	);
}
