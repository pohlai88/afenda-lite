"use client";

import { useRef, useState, useTransition } from "react";
import {
  DownloadIcon,
  FileJsonIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { exportSurveyPackageAction } from "@/app/actions/surveys";
import {
  createCdpStarterTemplate,
  serializeCdpPackage,
} from "@/lib/domain/survey-package";
import {
  analyzeUploadedPackage,
  SurveyPackageIngestDialog,
} from "@/features/operator/survey-package-ingest-dialog";
import { CdpAiPromptInstructions } from "@/features/operator/cdp-ai-prompt-instructions";
import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import { Checkbox } from "@/components-V2/platform-components/ui/checkbox";
import { Progress } from "@/components-V2/platform-components/ui/progress";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { PackageAnalysis } from "@/lib/domain/survey-package-analyze";
import { cn } from "@/lib/utils";

export function SurveyPackagePanel({ surveyId }: { surveyId: string }) {
  const { package: copy } = portalCopy.declarationDetail;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [createAssignment, setCreateAssignment] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] =
    useState<PackageAnalysis | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;

    setError(null);
    setSelectedFileName(file.name);
    startTransition(async () => {
      try {
        const packageJson = await file.text();
        const analysis = analyzeUploadedPackage(file, packageJson);
        setPendingAnalysis(analysis);
        setReviewOpen(true);
      } catch {
        setError(copy.invalidJson);
        setSelectedFileName(null);
      }
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{copy.uploadRequirementsTitle}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>{copy.uploadRequirementsAccepted}</li>
            <li>{copy.uploadRequirementsRejected}</li>
          </ul>
        </div>
        <div
          className={cn(
            "rounded-xl border border-dashed p-6 transition-colors",
            isDragging && "border-primary bg-primary/5",
            isPending && "opacity-70",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted">
              <UploadCloudIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{copy.upload}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.uploadHint}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPending ? copy.uploading : copy.upload}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                handleFile(file);
              }}
            />
          </div>
        </div>

        {selectedFileName ? (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <FileJsonIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {selectedFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reviewOpen
                      ? copy.reviewDescription
                      : copy.uploadHint}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                {isPending ? copy.uploading : "Ready"}
              </Badge>
            </div>
            {isPending ? (
              <div className="mt-3 space-y-1">
                <Progress value={35} />
                <p className="text-xs text-muted-foreground tabular-nums">
                  Validating package…
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              const packageJson = serializeCdpPackage(createCdpStarterTemplate());
              const blob = new Blob([packageJson], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "cdp-declaration-template.v1.json";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            <DownloadIcon />
            {copy.downloadTemplate}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await exportSurveyPackageAction(surveyId);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                if (!result?.packageJson) return;

                const blob = new Blob([result.packageJson], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `cdp-declaration-${surveyId.slice(0, 8)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
              });
            }}
          >
            <DownloadIcon />
            {isPending ? copy.downloading : copy.download}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{copy.downloadTemplateHint}</p>

        <CdpAiPromptInstructions />

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={createAssignment}
            onCheckedChange={(checked) => setCreateAssignment(checked === true)}
          />
          <span>
            <span className="font-medium">{copy.createAssignment}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {copy.createAssignmentHint}
            </span>
          </span>
        </label>
      </div>

      <SurveyPackageIngestDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) {
            setPendingAnalysis(null);
            setSelectedFileName(null);
          }
        }}
        surveyId={surveyId}
        analysis={pendingAnalysis}
        createAssignment={createAssignment}
      />
    </>
  );
}
