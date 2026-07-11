"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/modules/platform/clipboard";
import { buildCdpAiAssistantPrompt } from "@/modules/declarations/cdp-ai-prompt";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { Button } from "@/components-V2/platform-components/ui/button";
import { cn } from "@/modules/platform/utils";

export function CdpAiPromptInstructions({ className }: { className?: string }) {
  const { package: copy } = portalCopy.declarationDetail;
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const promptPreview = buildCdpAiAssistantPrompt();

  function handleCopy() {
    startTransition(async () => {
      try {
        await copyText(buildCdpAiAssistantPrompt());
        setCopied(true);
        toast.success(copy.aiPromptCopied);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(copy.aiPromptCopyFailed);
      }
    });
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-primary/20 bg-primary/5 p-4",
        className,
      )}
      aria-labelledby="cdp-ai-prompt-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3
              id="cdp-ai-prompt-heading"
              className="text-sm font-semibold text-foreground"
            >
              {copy.aiPromptTitle}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {copy.aiPromptDescription}
            </p>
          </div>

          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
            {copy.aiPromptSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.aiPromptPreviewLabel}
            </p>
            <pre className="portal-code-block max-h-40 overflow-y-auto whitespace-pre-wrap text-left">
              {promptPreview}
            </pre>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleCopy}
            className="bg-background"
          >
            {copied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
            {copied ? copy.aiPromptCopiedButton : copy.aiPromptCopyButton}
          </Button>
        </div>
      </div>
    </section>
  );
}
