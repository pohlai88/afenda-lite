import { MailCheckIcon, MailWarningIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getClientEmailDeliveryStatus } from "@/lib/email/mailersend-config";
import { portalCopy } from "@/lib/portal-copy";

export function ClientEmailDeliveryBanner() {
  const status = getClientEmailDeliveryStatus();
  const { emailDelivery } = portalCopy;

  if (status.enabled) {
    return (
      <Alert className="border-success/30 bg-success/5">
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
    <Alert className="border-warning/40 bg-warning/5 text-foreground *:data-[slot=alert-description]:text-muted-foreground">
      <MailWarningIcon />
      <AlertTitle>{emailDelivery.disabledTitle}</AlertTitle>
      <AlertDescription>{emailDelivery.disabledDescription}</AlertDescription>
    </Alert>
  );
}
