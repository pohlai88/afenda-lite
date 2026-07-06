import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { portalCopy } from "@/lib/portal-copy";

export function DeclarationQuestionsEmpty({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <PortalCustomerShell
      eyebrow={eyebrow}
      title={title}
      description={description}
    >
      <PortalEmptyState>
        {portalCopy.declarationPage.questionsNotConfigured}
      </PortalEmptyState>
    </PortalCustomerShell>
  );
}
