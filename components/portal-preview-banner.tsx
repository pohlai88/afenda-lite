import { exitClientPreviewAction } from "@/app/actions/admin";
import { auth } from "@/lib/auth/server";
import { isPreviewClientSession } from "@/lib/preview-client";
import { portalCopy } from "@/lib/portal-copy";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "lucide-react";

export async function PortalPreviewBanner() {
  const { data: session } = await auth.getSession();

  if (!isPreviewClientSession(session)) {
    return null;
  }

  const { previewClient } = portalCopy;

  return (
    <div className="border-b bg-muted/50 px-4 py-3" role="status">
      <Alert className="mx-auto max-w-lg border-primary/20 bg-background">
        <EyeIcon aria-hidden="true" />
        <AlertTitle>{previewClient.bannerTitle}</AlertTitle>
        <AlertDescription>{previewClient.bannerDescription}</AlertDescription>
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
