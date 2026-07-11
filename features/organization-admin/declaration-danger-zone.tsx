import { DeclarationDeleteButton } from "@/features/organization-admin/declaration-delete-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

/** account-settings-03 danger-zone pattern — destructive actions below settings, not a tab. */
export function DeclarationDangerZone({ surveyId }: { surveyId: string }) {
  const { manage } = portalCopy.declarationDetail;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="portal-card-title">{manage.deleteTitle}</CardTitle>
        <CardDescription>{manage.deleteDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <DeclarationDeleteButton surveyId={surveyId} />
      </CardContent>
    </Card>
  );
}
