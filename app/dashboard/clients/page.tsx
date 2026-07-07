import type { Metadata } from "next";
import { IssueClientInviteForm } from "@/components/issue-client-invite-form";
import {
  OrgClientAssignmentsTable,
  OrgClientInvitationsTable,
  type OrgClientAssignmentRow,
  type OrgClientInvitationRow,
} from "@/components/org-client-tables";
import { OrgInviteClientLink } from "@/components/org-invite-client-link";
import { DashboardPage, PortalSection } from "@/components/dashboard-page";
import { PortalEmptyStateCta } from "@/components/portal-empty-state-cta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listClientAssignmentsForAdmin,
  listClientInvitationsForAdmin,
} from "@/lib/clients";
import { formatDate } from "@/lib/format";
import { portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";
import { UserPlusIcon } from "lucide-react";

export default async function DashboardClientsPage() {
  const { clientInvite, clientInvitationsPage, clientDashboard, nav } =
    portalCopy;

  const [invitations, surveys, assignments] = await Promise.all([
    listClientInvitationsForAdmin(),
    listSurveysForAdmin(),
    listClientAssignmentsForAdmin(),
  ]);

  const invitationRows: OrgClientInvitationRow[] = invitations.map(
    (invitation) => ({
      id: invitation.id,
      token: invitation.token,
      fullName: invitation.fullName,
      email: invitation.email,
      status: invitation.status,
    }),
  );

  const assignmentRows: OrgClientAssignmentRow[] = assignments.map(
    (assignment) => ({
      id: assignment.id,
      surveyId: assignment.surveyId,
      surveyTitle: assignment.surveyTitle ?? "—",
      clientEmail: assignment.clientEmail,
      status: assignment.status,
      dueDate: assignment.dueDate ? formatDate(assignment.dueDate) : null,
    }),
  );

  return (
    <DashboardPage
      eyebrow={clientInvitationsPage.eyebrow}
      title={clientInvitationsPage.title}
      description={clientInvitationsPage.description}
      breadcrumbs={[
        { label: nav.declarations, href: "/dashboard" },
        { label: nav.clientInvitations },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Card id="invite-client" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>{clientInvite.issueTitle}</CardTitle>
            <CardDescription>{clientInvite.issueDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <IssueClientInviteForm
              surveys={surveys.map((survey) => ({
                id: survey.id,
                title: survey.title,
              }))}
            />
          </CardContent>
        </Card>

        <div className="space-y-8">
          <PortalSection
            title={clientInvitationsPage.recentTitle}
            description={clientInvitationsPage.recentDescription}
          >
            {invitations.length === 0 ? (
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
                labels={clientInvitationsPage}
              />
            )}
          </PortalSection>

          <PortalSection
            title={clientInvitationsPage.assignmentsTitle}
            description={clientInvitationsPage.assignmentsDescription}
          >
            {assignments.length === 0 ? (
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
                labels={{
                  tableDeclaration: clientInvitationsPage.tableDeclaration,
                  tableClient: clientInvitationsPage.tableClient,
                  tableStatus: clientInvitationsPage.tableStatus,
                  tableDue: clientInvitationsPage.tableDue,
                  pending: clientDashboard.pending,
                  submitted: clientDashboard.submitted,
                }}
              />
            )}
          </PortalSection>
        </div>
      </div>
    </DashboardPage>
  );
}
