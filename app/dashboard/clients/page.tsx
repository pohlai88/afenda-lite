import type { Metadata } from "next";
import Link from "next/link";
import { IssueClientInviteForm } from "@/components/issue-client-invite-form";
import { DashboardPage, PortalSection } from "@/components/dashboard-page";
import { PortalEmptyState } from "@/components/portal-empty-state";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listClientAssignmentsForAdmin,
  listClientInvitationsForAdmin,
} from "@/lib/clients";
import { formatDate } from "@/lib/format";
import { portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export default async function DashboardClientsPage() {
  const { clientInvite, clientInvitationsPage, nav } = portalCopy;

  const [invitations, surveys, assignments] = await Promise.all([
    listClientInvitationsForAdmin(),
    listSurveysForAdmin(),
    listClientAssignmentsForAdmin(),
  ]);

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
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{clientInvitationsPage.tableName}</TableHead>
                      <TableHead>{clientInvitationsPage.tableEmail}</TableHead>
                      <TableHead>{clientInvitationsPage.tableStatus}</TableHead>
                      <TableHead className="text-right">
                        {clientInvitationsPage.tableActions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.fullName}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {invitation.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {clientInvitationsPage.status[invitation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {invitation.status === "pending" ? (
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
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {clientInvitationsPage.tableDeclaration}
                      </TableHead>
                      <TableHead>{clientInvitationsPage.tableClient}</TableHead>
                      <TableHead>{clientInvitationsPage.tableStatus}</TableHead>
                      <TableHead className="text-right">
                        {clientInvitationsPage.tableDue}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          <Link
                            href={`/dashboard/${assignment.surveyId}`}
                            className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {assignment.surveyTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {assignment.clientEmail}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {assignment.dueDate
                            ? formatDate(assignment.dueDate)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </PortalSection>
        </div>
      </div>
    </DashboardPage>
  );
}
