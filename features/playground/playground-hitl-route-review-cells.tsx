"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClipboardIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components-V2/platform-components/ui/badge";
import { Button } from "@/components-V2/platform-components/ui/button";
import { PlaygroundPageShapeBadge } from "@/features/playground/playground-page-shape-badge";
import { usePlaygroundHitlReviews } from "@/features/playground/playground-hitl-confirm";
import { buildPlaygroundHitlRepairPrompt } from "@/features/playground/playground-hitl-repair-prompt";
import {
  buildPlaygroundHitlFingerprint,
  resolvePlaygroundHitlMark,
  type PlaygroundHitlRow,
} from "@/features/playground/playground-hitl-rows";
import { copyText } from "@/modules/platform/clipboard";

const ACTION_LABEL = {
  review: "Review",
  "verify-redirect": "Verify redirect",
  repair: "Frontend repair",
  blocked: "Blocked",
} as const;

const ACTION_CLASS = {
  review: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  "verify-redirect": "bg-sky-600/10 text-sky-700 dark:text-sky-400",
  repair: "bg-amber-600/10 text-amber-800 dark:text-amber-300",
  blocked: "bg-rose-600/10 text-rose-700 dark:text-rose-400",
} as const;

export function PlaygroundHitlRouteSummary({
  row,
  categoryLabel,
}: {
  row: PlaygroundHitlRow;
  categoryLabel: string;
}) {
  return (
    <div className="flex min-w-48 flex-col gap-2">
      <div>
        <p className="font-medium">{row.label}</p>
        <p className="text-muted-foreground break-all font-mono text-xs">
          {row.path}
        </p>
      </div>
      <p className="text-muted-foreground text-xs text-pretty">
        {row.review?.purpose ?? "Purpose is not classified."}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="bg-primary/10 text-primary h-auto rounded-sm border-none">
          {categoryLabel}
        </Badge>
        <PlaygroundPageShapeBadge shape={row.shape} />
      </div>
    </div>
  );
}

export function PlaygroundHitlExpectedOutcome({
  row,
}: {
  row: PlaygroundHitlRow;
}) {
  if (!row.pathConfigured) {
    return (
      <div className="min-w-56 space-y-1">
        <p className="font-medium">Fixture cannot be resolved</p>
        <p className="text-muted-foreground text-xs">
          Configure the missing playground path value before runtime review.
        </p>
      </div>
    );
  }

  if (!row.review) {
    return (
      <div className="min-w-56 space-y-1">
        <p className="font-medium">Unclassified</p>
        <p className="text-muted-foreground text-xs">
          Establish source evidence before reviewing this route.
        </p>
      </div>
    );
  }

  const { primary, alternates, evidence } = row.review;
  return (
    <div className="min-w-60 space-y-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide">
          {primary.outcome}
        </p>
        <p className="text-sm text-pretty">{primary.summary}</p>
      </div>
      {primary.when ? (
        <p className="text-muted-foreground text-xs">
          When: {primary.when}
        </p>
      ) : null}
      {primary.destinations?.length ? (
        <p className="text-muted-foreground text-xs">
          Destination: {primary.destinations.join(" · ")}
        </p>
      ) : null}
      {alternates?.length ? (
        <details className="text-xs">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer font-medium">
            {alternates.length} alternate scenario
            {alternates.length === 1 ? "" : "s"}
          </summary>
          <ul className="text-muted-foreground mt-2 space-y-2 border-l pl-3">
            {alternates.map((alternate) => (
              <li key={`${alternate.label}-${alternate.outcome}`}>
                <span className="text-foreground font-medium">
                  {alternate.label}:
                </span>{" "}
                {alternate.summary}
                {alternate.destinations?.length
                  ? ` → ${alternate.destinations.join(" · ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="text-muted-foreground text-[11px]">
        Evidence: {evidence.join(" · ")}
      </p>
    </div>
  );
}

export function PlaygroundHitlNextAction({
  row,
}: {
  row: PlaygroundHitlRow;
}) {
  const action = row.pathConfigured ? row.review?.action : null;
  if (!action) {
    return (
      <div className="min-w-40 space-y-1">
        <Badge className="bg-orange-600/10 text-orange-800 h-auto rounded-sm border-none dark:text-orange-300">
          Fixture repair
        </Badge>
        <p className="text-muted-foreground text-xs">
          Resolve the path fixture before review.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-40 space-y-1.5">
      <Badge
        className={`${ACTION_CLASS[action.kind]} h-auto rounded-sm border-none`}
      >
        {ACTION_LABEL[action.kind]}
      </Badge>
      <p className="text-muted-foreground text-xs text-pretty">
        {action.label}
      </p>
      {action.owner ? (
        <p className="text-muted-foreground text-[11px]">
          Owner: {action.owner}
        </p>
      ) : null}
    </div>
  );
}

export function PlaygroundHitlCopyPromptButton({
  row,
}: {
  row: PlaygroundHitlRow;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const { reviews, hydrated } = usePlaygroundHitlReviews();
  const fingerprint = buildPlaygroundHitlFingerprint(
    row.path,
    row.pathConfigured,
    row.shape,
    row.review,
  );
  const record = reviews[row.id];
  const mark = resolvePlaygroundHitlMark(record, fingerprint);
  const verdict =
    mark === "matches" || mark === "needs-repair" ? mark : undefined;

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }
    const timeout = window.setTimeout(() => setCopyState("idle"), 2_000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  async function copyPrompt() {
    try {
      await copyText(
        buildPlaygroundHitlRepairPrompt({
          row,
          verdict,
          note: record?.note,
        }),
      );
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hydrated}
        onClick={copyPrompt}
      >
        {copyState === "copied" ? (
          <CheckIcon aria-hidden />
        ) : copyState === "error" ? (
          <TriangleAlertIcon aria-hidden />
        ) : (
          <ClipboardIcon aria-hidden />
        )}
        {copyState === "copied" ? "Copied" : "Copy AI prompt"}
      </Button>
      <p className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? `Repair prompt copied for ${row.label}.`
          : copyState === "error"
            ? `Could not copy the repair prompt for ${row.label}.`
            : ""}
      </p>
    </div>
  );
}
