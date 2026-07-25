import type { CaLegalCompanyDetail } from "@afenda/corporate-administration";

import { CompanyIdentifiersPanel } from "./company-identifiers-panel";
import { CompanyProfilePanel } from "./company-profile-panel";
import { CompanyStatusTimeline } from "./company-status-timeline";
import { CompanyTabs } from "./company-tabs";

export function LegalCompanyDetail({
	company,
}: {
	company: CaLegalCompanyDetail;
}) {
	return (
		<CompanyTabs
			overview={
				<div className="grid gap-6 lg:grid-cols-2">
					<CompanyProfilePanel company={company} />
					<CompanyStatusTimeline history={company.statusHistory} />
				</div>
			}
			registration={<CompanyIdentifiersPanel company={company} />}
		/>
	);
}
