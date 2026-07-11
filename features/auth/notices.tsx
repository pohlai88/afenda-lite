import type { LucideIcon } from "lucide-react";
import { LinkIcon, MailCheckIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components-V2/platform-components/ui/alert";
import { portalCopy } from "@/modules/platform/copy/portal-copy";

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
      <AlertDescription className="text-foreground">{message}</AlertDescription>
    </Alert>
  );
}

/** @deprecated Use PortalAuthEmailTrustNotice */
export const PortalAuthOtpTrustNotice = PortalAuthEmailTrustNotice;

export function PortalAuthReasonNotice({ message }: { message: string }) {
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function PortalAccessDeniedNotice() {
  const { accessDenied, orgSignIn } = portalCopy;

  return (
    <Alert variant="destructive">
      <AlertTitle>{accessDenied.title}</AlertTitle>
      <AlertDescription>{orgSignIn.accessDenied}</AlertDescription>
    </Alert>
  );
}
