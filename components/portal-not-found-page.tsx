import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PORTAL_NAME } from "@/lib/portal-copy";

/** error-page-02 pattern — centered 404 with icon, message, and home CTA. */
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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex size-24 items-center justify-center rounded-2xl border border-dashed bg-muted/30">
        <FileQuestionIcon
          aria-hidden="true"
          className="size-12 text-muted-foreground"
        />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {PORTAL_NAME}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <Button
        className="touch-manipulation"
        render={<Link href={backHref} />}
        nativeButton={false}
      >
        {backLabel}
      </Button>
    </main>
  );
}
