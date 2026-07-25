import type { CaLegalCompanyDetail } from "@afenda/corporate-administration";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	KeyValueList,
	StatusBadge,
} from "@afenda/ui-system";

const statusTone = {
	draft: "pending",
	active: "success",
	suspended: "warning",
	dissolved: "error",
	archived: "inactive",
} as const;

export function CompanyProfilePanel({
	company,
}: {
	company: CaLegalCompanyDetail;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle>Company profile</CardTitle>
					<StatusBadge
						status={statusTone[company.status]}
						label={company.status}
					/>
				</div>
			</CardHeader>
			<CardContent>
				<KeyValueList
					size="sm"
					items={[
						{ label: "Company code", value: company.code },
						{
							label: "Legal entity",
							value: company.legalEntityNameSnapshot,
						},
						{
							label: "Organization party",
							value: company.legalPartyNameSnapshot,
						},
						{ label: "Legal form", value: company.legalFormNameSnapshot },
						{ label: "Incorporation date", value: company.incorporationDate },
						{ label: "Version", value: String(company.version) },
					]}
				/>
			</CardContent>
		</Card>
	);
}
