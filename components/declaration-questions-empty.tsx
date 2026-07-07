import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { clientDeclarationBreadcrumbs } from "@/lib/client-breadcrumbs";
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
  const isClientContext = Boolean(surveyTitle);

  return (
    <PortalCustomerShell
      variant={isClientContext ? "app" : "standalone"}
      eyebrow={eyebrow}
      title={title}
      description={description}
      breadcrumbs={
        isClientContext
          ? clientDeclarationBreadcrumbs(surveyTitle!)
          : undefined
      }
    >
      <PortalEmptyState>
        {portalCopy.declarationPage.questionsNotConfigured}
      </PortalEmptyState>
    </PortalCustomerShell>
  );
}
