import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import {
  buttonVariants,
} from "@/components-V2/platform-components/ui/button";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";
import { cn } from "@/modules/platform/utils";

/** Centered 404 with icon, message, and home CTA. */
export function PortalNotFoundPage({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="portal-centered-state flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-24 items-center justify-center rounded-2xl border border-dashed bg-muted/30">
        <FileQuestionIcon
          aria-hidden="true"
          className="size-12 text-muted-foreground"
        />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-sm text-muted-foreground">{PORTAL_NAME}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-pretty">{description}</p>
      </div>
      <Link
        href={backHref}
        className={cn(buttonVariants(), "touch-manipulation")}
      >
        {backLabel}
      </Link>
    </main>
  );
}
