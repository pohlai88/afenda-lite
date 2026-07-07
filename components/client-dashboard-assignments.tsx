import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { PortalEmptyStateCard } from "@/components/portal-empty-state";
import type { ClientAssignment } from "@/lib/clients";
import { assignmentDueUrgency } from "@/lib/client-dashboard-metrics";
import { formatDate } from "@/lib/format";
import { clientDeclareHref } from "@/lib/portal-routes";
import { portalCopy } from "@/lib/portal-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ClientDashboardAssignments({
  assignments,
  actionsEnabled,
}: {
  assignments: ClientAssignment[];
  actionsEnabled: boolean;
}) {
  const copy = portalCopy.clientDashboard;

  if (assignments.length === 0) {
    return (
      <PortalEmptyStateCard
        icon={ClipboardListIcon}
        title={copy.emptyTitle}
        description={copy.empty}
      />
    );
  }

  return (
    <div className="space-y-4" id="assignments">
      <div>
        <h2 className="portal-section-title">{copy.assignmentsSectionTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {copy.assignmentsSectionDescription}
        </p>
        {!actionsEnabled ? (
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            {copy.acknowledgement.gateNotice}
          </p>
        ) : null}
      </div>

      {assignments.map((assignment) => {
        const urgency = assignmentDueUrgency(assignment);
        const isSubmitted = assignment.status === "submitted";

        return (
          <Card key={assignment.id}>
            <CardHeader className="h-stack items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-pretty">{assignment.surveyTitle}</CardTitle>
                <CardDescription className="line-clamp-2 text-pretty">
                  {assignment.surveyQuestion}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {urgency === "overdue" ? (
                  <Badge variant="destructive">{copy.overdueLabel}</Badge>
                ) : null}
                {urgency === "due_soon" ? (
                  <Badge variant="outline">{copy.dueSoonLabel}</Badge>
                ) : null}
                <Badge variant={isSubmitted ? "secondary" : "outline"}>
                  {isSubmitted ? copy.submitted : copy.pending}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground text-pretty">
                {isSubmitted ? copy.submittedStatusHelp : copy.pendingStatusHelp}
              </p>
              {assignment.dueDate ? (
                <p className="text-xs text-muted-foreground">
                  {copy.dueLabel(formatDate(assignment.dueDate))}
                </p>
              ) : null}
              {isSubmitted && assignment.confirmationCode ? (
                <ConfirmationReceipt
                  code={assignment.confirmationCode}
                  title={copy.receiptTitle}
                  description={copy.receiptDescription}
                  variant="inline"
                />
              ) : actionsEnabled ? (
                <Button
                  render={
                    <Link href={clientDeclareHref(assignment.id)} />
                  }
                  nativeButton={false}
                >
                  {copy.complete}
                </Button>
              ) : (
                <Button disabled>{copy.complete}</Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
