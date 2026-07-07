import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { portalCopy } from "@/lib/portal-copy";

export function PortalAccessDeniedNotice() {
  const { accessDenied, orgSignIn } = portalCopy;

  return (
    <Alert variant="destructive">
      <AlertTitle>{accessDenied.title}</AlertTitle>
      <AlertDescription>{orgSignIn.accessDenied}</AlertDescription>
    </Alert>
  );
}
