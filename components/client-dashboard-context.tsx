import { portalCopy } from "@/lib/portal-copy";
import { PortalLegalNoticeSection } from "@/components/portal-legal-notice-section";
import { PortalStatutoryFaq } from "@/components/portal-statutory-faq";

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
