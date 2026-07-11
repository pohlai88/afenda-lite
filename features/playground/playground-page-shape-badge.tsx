"use client";

import { Badge } from "@/components-V2/platform-components/ui/badge";
import { cn } from "@/components-V2/lib/utils";
import {
  PLAYGROUND_PAGE_SHAPE_DESCRIPTION,
  PLAYGROUND_PAGE_SHAPE_LABEL,
  isPlaygroundPageOutOfShape,
  type PlaygroundPageShape,
} from "@/features/playground/playground-page-shape";

const SHAPE_BADGE_CLASS: Record<PlaygroundPageShape, string> = {
  live: "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  redirect:
    "bg-sky-600/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400",
  stub: "bg-amber-600/10 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  closed:
    "bg-rose-600/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
  "fixture-gap":
    "bg-orange-600/10 text-orange-800 dark:bg-orange-400/10 dark:text-orange-300",
};

export function PlaygroundPageShapeBadge({
  shape,
  className,
  showDescription = false,
}: {
  shape: PlaygroundPageShape;
  className?: string;
  showDescription?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Badge
        data-playground-shape={shape}
        data-out-of-shape={isPlaygroundPageOutOfShape(shape) ? "true" : "false"}
        className={cn(
          "h-auto w-fit rounded-sm border-none",
          SHAPE_BADGE_CLASS[shape],
        )}
      >
        {PLAYGROUND_PAGE_SHAPE_LABEL[shape]}
      </Badge>
      {showDescription ? (
        <p className="text-muted-foreground text-xs text-pretty">
          {PLAYGROUND_PAGE_SHAPE_DESCRIPTION[shape]}
        </p>
      ) : null}
    </div>
  );
}
