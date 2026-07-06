import Link from "next/link";
import { redirect } from "next/navigation";
import { IssueClientInviteForm } from "@/components/issue-client-invite-form";
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
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { listClientInvitationsForAdmin } from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export default async function DashboardClientsPage() {
  const { clientInvite, account } = portalCopy;
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/?reason=access-denied");
  }

  const [invitations, surveys] = await Promise.all([
    listClientInvitationsForAdmin(),
    listSurveysForAdmin(),
  ]);

  return (
    <PortalShell
      eyebrow={account.eyebrow}
      title="Client invitations"
      description="Issue secure client accounts and assign declarations."
      backHref="/dashboard"
      backLabel={account.title}
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

        <PortalSection title="Recent invitations" description="Pending and accepted client invites.">
          {invitations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No client invitations yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <Card key={invitation.id} size="sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm">{invitation.fullName}</CardTitle>
                      <CardDescription>{invitation.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">{invitation.status}</Badge>
                  </CardHeader>
                  {invitation.status === "pending" ? (
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/invite/${invitation.token}`} target="_blank" />
                        }
                        nativeButton={false}
                      >
                        Open invite link
                      </Button>
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}
