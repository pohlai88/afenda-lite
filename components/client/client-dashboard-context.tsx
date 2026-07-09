import { portalCopy } from "@/lib/copy/portal-copy";
import { PortalLegalNoticeSection } from "@/components/portal/portal-legal-notice-section";
import { PortalStatutoryFaq } from "@/components/portal/portal-statutory-faq";

export function ClientDashboardContext() {
  const { legalNoticeTitle, legalNotice, statutoryTitle, statutoryItems } =
    portalCopy.clientDashboard;

  return (
    <div className="v-stack gap-6">
      <PortalLegalNoticeSection
        id="dashboard-legal-notice"
        title={legalNoticeTitle}
        paragraphs={legalNotice}
      />
      <PortalStatutoryFaq
        id="dashboard-statutory"
        title={statutoryTitle}
        items={statutoryItems}
      />
    </div>
  );
}
