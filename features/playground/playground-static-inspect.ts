/**
 * Shape-first Static Inspect — pure gate (no RSC). Shape map is SSOT.
 */

import {
  isPlaygroundScreenPathConfigured,
  playgroundScreenDefs,
} from "@/features/playground/playground-registry";
import { isPlaygroundStaticCompositionId } from "@/features/playground/playground-static-composition-ids";
import {
  PLAYGROUND_PAGE_SHAPE_DESCRIPTION,
  PLAYGROUND_PAGE_SHAPE_LABEL,
  declaredPlaygroundPageShape,
  resolvePlaygroundPageShape,
  type PlaygroundPageShape,
} from "@/features/playground/playground-page-shape";

export type PlaygroundStaticInspectGate =
  | {
      kind: "condition";
      screenId: string;
      label: string;
      path: string;
      shape: PlaygroundPageShape;
      reason: string;
    }
  | {
      kind: "live-embed-only";
      screenId: string;
      label: string;
      path: string;
      shape: "live";
      reason: string;
    }
  | {
      kind: "mount";
      screenId: string;
      label: string;
      path: string;
      shape: "live";
    };

export function resolvePlaygroundStaticInspectGate(
  screenId: string,
): PlaygroundStaticInspectGate {
  const def = playgroundScreenDefs.find((screen) => screen.id === screenId);
  const path = def?.path ?? `/${screenId}`;
  const label = def?.label ?? screenId;
  const pathConfigured = isPlaygroundScreenPathConfigured(path);
  const shape = resolvePlaygroundPageShape(
    declaredPlaygroundPageShape(screenId),
    pathConfigured,
  );

  if (shape !== "live") {
    return {
      kind: "condition",
      screenId,
      label,
      path,
      shape,
      reason: `${PLAYGROUND_PAGE_SHAPE_LABEL[shape]}: ${PLAYGROUND_PAGE_SHAPE_DESCRIPTION[shape]}`,
    };
  }

  if (!isPlaygroundStaticCompositionId(screenId)) {
    return {
      kind: "live-embed-only",
      screenId,
      label,
      path,
      shape: "live",
      reason:
        "Shape is live. Static does not duplicate this page — use Live embeds or Preview for the actual route.",
    };
  }

  return {
    kind: "mount",
    screenId,
    label,
    path,
    shape: "live",
  };
}
