import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { portalCopy } from "@/lib/portal-copy";

export function DeclarationQuestionsEmpty({
  eyebrow,
  title,
  description,
  surveyTitle,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  surveyTitle?: string;
}) {
  const { clientDashboard, nav } = portalCopy;
  const isClientContext = Boolean(surveyTitle);

  return (
    <PortalCustomerShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      backHref={isClientContext ? "/client" : undefined}
      backLabel={isClientContext ? clientDashboard.backToAssignments : undefined}
      homeHref={isClientContext ? "/client" : undefined}
      showSignOut={isClientContext}
      breadcrumbs={
        isClientContext
          ? [
              { label: nav.assignments, href: "/client" },
              { label: surveyTitle! },
            ]
          : undefined
      }
    >
      <PortalEmptyState>
        {portalCopy.declarationPage.questionsNotConfigured}
      </PortalEmptyState>
    </PortalCustomerShell>
  );
}
