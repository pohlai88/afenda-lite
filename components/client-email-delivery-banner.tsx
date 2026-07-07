import { MailCheckIcon, MailWarningIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getClientEmailDeliveryStatus } from "@/lib/email/mailersend-config";
import { portalCopy } from "@/lib/portal-copy";

export function ClientEmailDeliveryBanner() {
  const status = getClientEmailDeliveryStatus();
  const { emailDelivery } = portalCopy;

  if (status.enabled) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/5">
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
    <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/5 text-foreground *:data-[slot=alert-description]:text-muted-foreground">
      <MailWarningIcon />
      <AlertTitle>{emailDelivery.disabledTitle}</AlertTitle>
      <AlertDescription>{emailDelivery.disabledDescription}</AlertDescription>
    </Alert>
  );
}
