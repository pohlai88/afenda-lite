import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/app/actions/admin";
import { IssueClientInviteForm } from "@/components/issue-client-invite-form";
import { PortalEmptyState } from "@/components/portal-empty-state";
import { PortalSection, PortalShell } from "@/components/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export default async function DashboardClientsPage() {
  const { clientInvite, clientInvitationsPage, org } = portalCopy;
  await requireAdminSession();

  const [invitations, surveys, assignments] = await Promise.all([
    listClientInvitationsForAdmin(),
    listSurveysForAdmin(),
    listClientAssignmentsForAdmin(),
  ]);

  return (
    <PortalShell
      eyebrow={clientInvitationsPage.eyebrow}
      title={clientInvitationsPage.title}
      description={clientInvitationsPage.description}
      backHref="/dashboard"
      backLabel={org.title}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <Card>
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
              <PortalEmptyState>{clientInvitationsPage.empty}</PortalEmptyState>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} size="sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-sm">
                          {invitation.fullName}
                        </CardTitle>
                        <CardDescription>{invitation.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {clientInvitationsPage.status[invitation.status]}
                      </Badge>
                    </CardHeader>
                    {invitation.status === "pending" ? (
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link
                              href={`/invite/${invitation.token}`}
                              target="_blank"
                            />
                          }
                          nativeButton={false}
                        >
                          {clientInvitationsPage.openInvite}
                        </Button>
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </PortalSection>

          <PortalSection
            title={clientInvitationsPage.assignmentsTitle}
            description={clientInvitationsPage.assignmentsDescription}
          >
            {assignments.length === 0 ? (
              <PortalEmptyState>
                {clientInvitationsPage.assignmentsEmpty}
              </PortalEmptyState>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} size="sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-sm">
                          {assignment.surveyTitle}
                        </CardTitle>
                        <CardDescription>
                          {assignment.clientEmail}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          assignment.status === "submitted"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {assignment.status === "submitted"
                          ? portalCopy.clientDashboard.submitted
                          : portalCopy.clientDashboard.pending}
                      </Badge>
                    </CardHeader>
                    {assignment.dueDate ? (
                      <CardContent className="pt-0 text-xs text-muted-foreground">
                        {portalCopy.clientDashboard.dueLabel(
                          assignment.dueDate.toLocaleDateString(),
                        )}
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </PortalSection>
        </div>
      </div>
    </PortalShell>
  );
}
