import type { ReactNode } from "react";
import { Suspense } from "react";

import { PlaygroundHitlBoard } from "@/features/playground/playground-hitl-board";
import type { PlaygroundHitlRow } from "@/features/playground/playground-hitl-rows";

export type PlaygroundHitlChecklistProps = {
  rows: PlaygroundHitlRow[];
  staticComposition?: ReactNode;
};

/**
 * AdminCN portal-view for `/playground/hitl-review`.
 * Live | Static board with category/shape filters + optional server composition.
 */
export default function PlaygroundHitlChecklist({
  rows,
  staticComposition = null,
}: PlaygroundHitlChecklistProps) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground p-6 text-sm">
          Loading route review…
        </div>
      }
    >
      <PlaygroundHitlBoard
        rows={rows}
        staticComposition={staticComposition}
      />
    </Suspense>
  );
}
