import { ClientEmailDeliveryBanner } from "@/components/client-email-delivery-banner";
import { DashboardPage } from "@/components/dashboard-page";
import { IssueClientInviteForm } from "@/components/issue-client-invite-form";
import {
  OrgClientAssignmentsTable,
  OrgClientInvitationsTable,
} from "@/components/org-client-tables";
import {
  InviteClientHashHandler,
  OrgInviteClientLink,
} from "@/components/org-invite-client-link";
import { PortalEmptyStateCta } from "@/components/portal-empty-state-cta";
import { PortalFormSection } from "@/components/portal-form-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { operatorClientsBreadcrumbs } from "@/lib/operator-breadcrumbs";
import type { OperatorClientsPageData } from "@/lib/operator-clients-page";
import { portalCopy } from "@/lib/portal-copy";
import { UserPlusIcon } from "lucide-react";

export function OperatorClientsPageView({
  data,
}: {
  data: OperatorClientsPageData;
}) {
  const { clientInvite, clientInvitationsPage, clientDashboard } = portalCopy;
  const { emailDeliveryEnabled, invitationRows, assignmentRows, inviteSurveys } =
    data;

  return (
    <DashboardPage
      eyebrow={clientInvitationsPage.eyebrow}
      title={clientInvitationsPage.title}
      description={clientInvitationsPage.description}
      breadcrumbs={operatorClientsBreadcrumbs()}
    >
      <InviteClientHashHandler />
      <ClientEmailDeliveryBanner />

      <div className="grid gap-8 portal-grid-split-wide">
        <PortalFormSection
          id="invite-client"
          className="scroll-mt-20"
          title={clientInvite.issueTitle}
          description={
            emailDeliveryEnabled
              ? clientInvite.issueDescriptionWithEmail
              : clientInvite.issueDescriptionWithoutEmail
          }
        >
          <IssueClientInviteForm
            emailDeliveryEnabled={emailDeliveryEnabled}
            surveys={inviteSurveys}
          />
        </PortalFormSection>

        <div className="min-w-0 space-y-8">
          <Alert>
            <AlertDescription>
              {clientInvitationsPage.managementNote}
            </AlertDescription>
          </Alert>

          {invitationRows.length === 0 ? (
            <PortalEmptyStateCta
              sectionTitle={clientInvitationsPage.recentTitle}
              sectionDescription={clientInvitationsPage.recentDescription}
              icon={UserPlusIcon}
              title={clientInvitationsPage.emptyTitle}
              description={clientInvitationsPage.emptyDescription}
              action={
                <OrgInviteClientLink
                  label={clientInvitationsPage.emptyAction}
                />
              }
            />
          ) : (
            <OrgClientInvitationsTable
              rows={invitationRows}
              title={clientInvitationsPage.recentTitle}
              description={clientInvitationsPage.recentDescription}
              labels={clientInvitationsPage}
            />
          )}

          {assignmentRows.length === 0 ? (
            <PortalEmptyStateCta
              sectionTitle={clientInvitationsPage.assignmentsTitle}
              sectionDescription={clientInvitationsPage.assignmentsDescription}
              icon={UserPlusIcon}
              title={clientInvitationsPage.assignmentsEmptyTitle}
              description={clientInvitationsPage.assignmentsEmptyDescription}
              action={
                <OrgInviteClientLink
                  label={clientInvitationsPage.emptyAction}
                />
              }
            />
          ) : (
            <OrgClientAssignmentsTable
              rows={assignmentRows}
              title={clientInvitationsPage.assignmentsTitle}
              description={clientInvitationsPage.assignmentsDescription}
              labels={{
                tableDeclaration: clientInvitationsPage.tableDeclaration,
                tableClient: clientInvitationsPage.tableClient,
                tableStatus: clientInvitationsPage.tableStatus,
                tableDue: clientInvitationsPage.tableDue,
                tableActions: clientInvitationsPage.tableActions,
                removeAssignment: clientInvitationsPage.removeAssignment,
                pending: clientDashboard.pending,
                submitted: clientDashboard.submitted,
                searchPlaceholder:
                  clientInvitationsPage.searchAssignmentsPlaceholder,
                filterAll: clientInvitationsPage.filterAll,
                filterStatusLabel: clientInvitationsPage.filterStatusLabel,
              }}
            />
          )}
        </div>
      </div>
    </DashboardPage>
  );
}
