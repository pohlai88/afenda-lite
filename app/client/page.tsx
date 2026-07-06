import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { isAdminSession } from "@/lib/admin";
import { getClientProfile, listClientAssignments } from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";

export default async function ClientDashboardPage() {
  const { clientDashboard } = portalCopy;
  const { data: session } = await auth.getSession();

  if (!session?.user?.email) {
    redirect("/client/login");
  }

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  const profile = session.user.id
    ? await getClientProfile(session.user.id)
    : null;

  if (!profile?.onboardingComplete) {
    redirect("/client/onboarding");
  }

  const assignments = await listClientAssignments(session.user.email);

  return (
    <PortalCustomerShell
      eyebrow={clientDashboard.eyebrow}
      title={clientDashboard.title}
      description={clientDashboard.description}
    >
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {clientDashboard.empty}
          </CardContent>
        </Card>
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
                {assignment.status === "submitted" && assignment.confirmationCode ? (
                  <div className="portal-info-block">
                    <p className="text-xs text-muted-foreground">
                      {clientDashboard.receiptTitle}
                    </p>
                    <p className="font-mono font-medium">
                      {assignment.confirmationCode}
                    </p>
                  </div>
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
