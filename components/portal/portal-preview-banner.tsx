import { exitClientPreviewAction } from "@/app/actions/admin";
import { isPreviewClientSession } from "@/lib/preview-client";
import type { PortalMember } from "@/lib/portal-member-types";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "lucide-react";

export function PortalPreviewBanner({
  member,
}: {
  member: PortalMember | null;
}) {
  if (!member?.isPreviewSession) {
    return null;
  }

  const { previewClient } = portalCopy;

  return (
    <div className="border-b bg-muted/50 px-4 py-3" role="status">
      <Alert className="mx-auto max-w-lg border-primary/20 bg-background">
        <EyeIcon aria-hidden="true" />
        <AlertTitle>{previewClient.bannerTitle}</AlertTitle>
        <AlertDescription>
          {previewClient.bannerDescription}{" "}
          {member.displayName !== member.email ? (
            <span className="font-medium text-foreground">
              Viewing as {member.displayName}.
            </span>
          ) : null}
        </AlertDescription>
        <AlertAction>
          <form action={exitClientPreviewAction}>
            <Button type="submit" size="sm" variant="outline">
              {previewClient.returnToOrg}
            </Button>
          </form>
        </AlertAction>
      </Alert>
    </div>
  );
}
