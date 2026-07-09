import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { ClientAssignmentDeadlineNotice } from "@/components/client/client-assignment-deadline-notice";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
import { PortalEmptyStateCard } from "@/components/portal/portal-empty-state";
import type { AssignmentCardView } from "@/lib/client-dashboard.presenter";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function statusCopy(
  status: AssignmentCardView["status"],
  copy: typeof portalCopy.clientDashboard,
) {
  switch (status) {
    case "submitted":
      return {
        label: copy.submitted,
        help: copy.submittedStatusHelp,
      };
    case "inProgress":
      return {
        label: copy.inProgress,
        help: copy.inProgressStatusHelp,
      };
    default:
      return {
        label: copy.pending,
        help: copy.pendingStatusHelp,
      };
  }
}

export function ClientDashboardAssignments({
  assignments,
  actionsEnabled,
}: {
  assignments: AssignmentCardView[];
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
    <section className="space-y-4" id="assignments" aria-labelledby="assignments-heading">
      <div>
        <h2 id="assignments-heading" className="portal-section-title text-pretty">
          {copy.assignmentsSectionTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {copy.assignmentsSectionDescription}
        </p>
        {!actionsEnabled ? (
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            {copy.acknowledgement.gateNotice}
          </p>
        ) : null}
      </div>

      <ul className="space-y-4">
        {assignments.map((assignment) => {
          const { label, help } = statusCopy(assignment.status, copy);
          const isSubmitted = assignment.status === "submitted";

          return (
            <li key={assignment.id} className="min-w-0">
              <Card>
                <CardHeader className="h-stack items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-pretty">{assignment.title}</CardTitle>
                    {assignment.question ? (
                      <CardDescription className="line-clamp-2 min-w-0 text-pretty">
                        {assignment.question}
                      </CardDescription>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {assignment.urgency === "overdue" ? (
                      <Badge variant="destructive">{copy.overdueLabel}</Badge>
                    ) : null}
                    {assignment.urgency === "due_soon" ? (
                      <Badge variant="outline">{copy.dueSoonLabel}</Badge>
                    ) : null}
                    <Badge variant={isSubmitted ? "secondary" : "outline"}>
                      {label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground text-pretty">
                    {help}
                  </p>

                  {!isSubmitted ? (
                    <ClientAssignmentDeadlineNotice
                      assignment={{
                        status: "pending",
                        dueDate: assignment.dueDate,
                        submitBefore: assignment.submitBefore,
                      }}
                    />
                  ) : null}

                  {isSubmitted && assignment.confirmationCode ? (
                    <>
                      <ConfirmationReceipt
                        code={assignment.confirmationCode}
                        title={copy.receiptTitle}
                        description={copy.receiptDescription}
                        variant="inline"
                      />
                      <Button
                        variant="outline"
                        className="min-h-11 touch-manipulation"
                        render={<Link href={assignment.href} />}
                        nativeButton={false}
                      >
                        {copy.viewReceipt}
                      </Button>
                    </>
                  ) : actionsEnabled && assignment.urgency !== "overdue" ? (
                    <Button
                      className="min-h-11 touch-manipulation"
                      render={<Link href={assignment.href} />}
                      nativeButton={false}
                    >
                      {assignment.status === "inProgress"
                        ? copy.continue
                        : copy.complete}
                    </Button>
                  ) : (
                    <Button className="min-h-11 touch-manipulation" disabled>
                      {copy.complete}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
