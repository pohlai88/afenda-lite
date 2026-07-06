import type { Metadata } from "next";
import Link from "next/link";
import { requireClientSession } from "@/app/actions/client";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { ConfirmationReceipt } from "@/components/confirmation-receipt";
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
import { listClientAssignments } from "@/lib/clients";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.client.title}`,
  description: portalCopy.metadata.client.description,
};

export default async function ClientDashboardPage() {
  const { clientDashboard } = portalCopy;
  const session = await requireClientSession({ requireOnboarding: true });
  const assignments = await listClientAssignments(session.user.email);

  return (
    <PortalCustomerShell
      eyebrow={clientDashboard.eyebrow}
      title={clientDashboard.title}
      description={clientDashboard.description}
      showSignOut
    >
      {assignments.length === 0 ? (
        <PortalEmptyState>{clientDashboard.empty}</PortalEmptyState>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{assignment.surveyTitle}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {assignment.surveyQuestion}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    assignment.status === "submitted" ? "secondary" : "outline"
                  }
                >
                  {assignment.status === "submitted"
                    ? clientDashboard.submitted
                    : clientDashboard.pending}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.dueDate ? (
                  <p className="text-xs text-muted-foreground">
                    {clientDashboard.dueLabel(
                      assignment.dueDate.toLocaleDateString(),
                    )}
                  </p>
                ) : null}
                {assignment.status === "submitted" &&
                assignment.confirmationCode ? (
                  <ConfirmationReceipt
                    code={assignment.confirmationCode}
                    title={clientDashboard.receiptTitle}
                    description={clientDashboard.receiptDescription}
                    variant="inline"
                  />
                ) : (
                  <Button
                    render={
                      <Link href={`/client/declare/${assignment.id}`} />
                    }
                    nativeButton={false}
                  >
                    {clientDashboard.complete}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalCustomerShell>
  );
}
