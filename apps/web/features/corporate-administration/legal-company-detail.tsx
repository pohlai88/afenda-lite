import type { CaLegalCompanyDetail } from "@afenda/corporate-administration";
import type { ReactNode } from "react";

import { CompanyIdentifiersPanel } from "./company-identifiers-panel";
import { CompanyProfilePanel } from "./company-profile-panel";
import { CompanyStatusTimeline } from "./company-status-timeline";
import { CompanyTabs } from "./company-tabs";

export function LegalCompanyDetail({
	company,
	governance,
	premises,
	capital,
	property,
	corporateAssets,
	intellectualProperty,
	insuranceCharges,
}: {
	company: CaLegalCompanyDetail;
	governance: ReactNode;
	premises: ReactNode;
	capital: ReactNode;
	property: ReactNode;
	corporateAssets: ReactNode;
	intellectualProperty: ReactNode;
	insuranceCharges: ReactNode;
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
			governance={governance}
			premises={premises}
			capital={capital}
			property={property}
			corporateAssets={corporateAssets}
			intellectualProperty={intellectualProperty}
			insuranceCharges={insuranceCharges}
		/>
	);
}
