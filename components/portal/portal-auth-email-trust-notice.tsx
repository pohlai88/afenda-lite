import { Alert, AlertDescription } from "@/components/ui/alert";
import type { LucideIcon } from "lucide-react";
import { LinkIcon, MailCheckIcon } from "lucide-react";

export function PortalAuthEmailTrustNotice({
  message,
  variant = "email",
}: {
  message: string;
  variant?: "email" | "link";
}) {
  const Icon: LucideIcon = variant === "link" ? LinkIcon : MailCheckIcon;

  return (
    <Alert className="max-w-sm border-primary/20 bg-primary/5">
      <Icon aria-hidden className="size-4 text-primary" />
      <AlertDescription className="text-body text-foreground">
        {message}
      </AlertDescription>
    </Alert>
  );
}

/** @deprecated Use PortalAuthEmailTrustNotice */
export const PortalAuthOtpTrustNotice = PortalAuthEmailTrustNotice;
