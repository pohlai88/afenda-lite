import { MailCheckIcon, MailWarningIcon, UserPlusIcon } from "lucide-react";
import { IssueClientInviteForm } from "@/features/organization-admin/issue-client-invite-form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components-V2/platform-components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import {
  PortalClientAssignmentsTable,
  PortalClientInvitationsTable,
} from "@/components-V2/platform-views/portal-views/portal-client-tables";
import {
  PortalInviteClientHashHandler,
  PortalInviteClientLink,
} from "@/components-V2/platform-views/portal-views/portal-invite-client-link";
import { getClientEmailDeliveryStatus } from "@/modules/identity/email/client-email-delivery";
import type { OrganizationAdminClientsPageData } from "@/features/organization-admin/organization-admin-clients-page";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

function EmailDeliveryBanner() {
  const status = getClientEmailDeliveryStatus();
  const { emailDelivery } = portalCopy;

  if (status.enabled) {
    return (
      <Alert>
        <MailCheckIcon />
        <AlertTitle>{emailDelivery.enabledTitle}</AlertTitle>
        <AlertDescription>
          {emailDelivery.enabledDescription({
            fromName: status.fromName,
            fromEmail: status.fromEmail,
          })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <MailWarningIcon />
      <AlertTitle>{emailDelivery.disabledTitle}</AlertTitle>
      <AlertDescription>{emailDelivery.disabledDescription}</AlertDescription>
    </Alert>
  );
}

function EmptySection({
  sectionTitle,
  sectionDescription,
  title,
  description,
  actionLabel,
}: {
  sectionTitle: string;
  sectionDescription: string;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{sectionTitle}</CardTitle>
        <CardDescription className="text-pretty">{sectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
          <UserPlusIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-sm text-pretty">{description}</p>
        </div>
        <PortalInviteClientLink label={actionLabel} />
      </CardContent>
    </Card>
  );
}

export default function OrganizationAdminClientsList({
  data,
}: {
  data: OrganizationAdminClientsPageData;
}) {
  const { clientInvite, clientInvitationsPage } = portalCopy;
  const { emailDeliveryEnabled, invitationRows, assignmentRows, inviteSurveys } =
    data;

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {clientInvitationsPage.eyebrow}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {clientInvitationsPage.title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-pretty text-sm">
          {clientInvitationsPage.description}
        </p>
      </header>

      <PortalInviteClientHashHandler />
      <EmailDeliveryBanner />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card id="invite-client" className="scroll-mt-20 shadow-none" tabIndex={-1}>
          <CardHeader>
            <CardTitle>{clientInvite.issueTitle}</CardTitle>
            <CardDescription className="text-pretty">
              {emailDeliveryEnabled
                ? clientInvite.issueDescriptionWithEmail
                : clientInvite.issueDescriptionWithoutEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IssueClientInviteForm
              emailDeliveryEnabled={emailDeliveryEnabled}
              surveys={inviteSurveys}
            />
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <Alert>
            <AlertDescription>
              {clientInvitationsPage.managementNote}
            </AlertDescription>
          </Alert>

          {invitationRows.length === 0 ? (
            <EmptySection
              sectionTitle={clientInvitationsPage.recentTitle}
              sectionDescription={clientInvitationsPage.recentDescription}
              title={clientInvitationsPage.emptyTitle}
              description={clientInvitationsPage.emptyDescription}
              actionLabel={clientInvitationsPage.emptyAction}
            />
          ) : (
            <PortalClientInvitationsTable
              rows={invitationRows}
              title={clientInvitationsPage.recentTitle}
              description={clientInvitationsPage.recentDescription}
            />
          )}

          {assignmentRows.length === 0 ? (
            <EmptySection
              sectionTitle={clientInvitationsPage.assignmentsTitle}
              sectionDescription={clientInvitationsPage.assignmentsDescription}
              title={clientInvitationsPage.assignmentsEmptyTitle}
              description={clientInvitationsPage.assignmentsEmptyDescription}
              actionLabel={clientInvitationsPage.emptyAction}
            />
          ) : (
            <PortalClientAssignmentsTable
              rows={assignmentRows}
              title={clientInvitationsPage.assignmentsTitle}
              description={clientInvitationsPage.assignmentsDescription}
            />
          )}
        </div>
      </div>
    </div>
  );
}
