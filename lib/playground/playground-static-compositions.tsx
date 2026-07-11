import "server-only";

import type { ReactNode } from "react";

import OperatorClientsList from "@/components-V2/platform-views/portal-views/operator-clients-list";
import OperatorDeclarationDetailView from "@/components-V2/platform-views/portal-views/operator-declaration-detail";
import OperatorDeclarationsDashboard from "@/components-V2/platform-views/portal-views/operator-declarations-dashboard";
import { LynxLandingPage } from "@/features/landing";
import { loadOperatorClientsPage } from "@/lib/pages/operator-clients-page";
import { loadOperatorDashboardPage } from "@/lib/pages/operator-dashboard-page";
import { loadOperatorDeclarationDetail } from "@/lib/pages/operator-declaration-detail";
import {
  isPlaygroundStaticCompositionId,
  type PlaygroundStaticCompositionId,
} from "@/lib/playground/playground-static-composition-ids";
import { playgroundEnv } from "@/lib/playground/playground-registry";
import { resolvePlaygroundStaticInspectGate } from "@/lib/playground/playground-static-inspect";
import type { PlaygroundPageShape } from "@/lib/playground/playground-page-shape";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";

export {
  PLAYGROUND_STATIC_COMPOSITION_IDS,
  isPlaygroundStaticCompositionId,
  type PlaygroundStaticCompositionId,
} from "@/lib/playground/playground-static-composition-ids";

export type PlaygroundStaticCompositionResult =
  | {
      status: "ready";
      screenId: PlaygroundStaticCompositionId;
      kind: "page";
      title: string;
      shape: "live";
      node: ReactNode;
    }
  | {
      status: "condition";
      screenId: string;
      label: string;
      path: string;
      shape: PlaygroundPageShape;
      reason: string;
    }
  | {
      status: "live-embed-only";
      screenId: string;
      label: string;
      path: string;
      shape: "live";
      reason: string;
    };

/**
 * Static Inspect — always upgrades with the shape map.
 * Mounts RSC only when shape is live and a real loader is allowlisted.
 */
export async function loadPlaygroundStaticComposition(
  screenId: string,
): Promise<PlaygroundStaticCompositionResult> {
  const gate = resolvePlaygroundStaticInspectGate(screenId);

  if (gate.kind === "condition") {
    return {
      status: "condition",
      screenId: gate.screenId,
      label: gate.label,
      path: gate.path,
      shape: gate.shape,
      reason: gate.reason,
    };
  }

  if (gate.kind === "live-embed-only") {
    return {
      status: "live-embed-only",
      screenId: gate.screenId,
      label: gate.label,
      path: gate.path,
      shape: "live",
      reason: gate.reason,
    };
  }

  if (!isPlaygroundStaticCompositionId(screenId)) {
    return {
      status: "live-embed-only",
      screenId: gate.screenId,
      label: gate.label,
      path: gate.path,
      shape: "live",
      reason: "No RSC mount for this live screen.",
    };
  }

  switch (screenId) {
    case "admin-dashboard": {
      const data = await loadOperatorDashboardPage();
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Operator dashboard",
        shape: "live",
        node: <OperatorDeclarationsDashboard data={data} />,
      };
    }
    case "admin-clients": {
      const data = await loadOperatorClientsPage();
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Clients",
        shape: "live",
        node: <OperatorClientsList data={data} />,
      };
    }
    case "admin-survey-detail":
    case "dynamic-dashboard-id": {
      const surveyId = playgroundEnv("PLAYGROUND_SURVEY_ID");
      if (!surveyId) {
        return {
          status: "live-embed-only",
          screenId,
          label: gate.label,
          path: gate.path,
          shape: "live",
          reason:
            "PLAYGROUND_SURVEY_ID is not set — cannot load declaration detail in-shell. Use Live/Preview once the fixture is set.",
        };
      }
      const detail = await loadOperatorDeclarationDetail(surveyId);
      if (!detail) {
        return {
          status: "live-embed-only",
          screenId,
          label: gate.label,
          path: gate.path,
          shape: "live",
          reason: `No declaration found for PLAYGROUND_SURVEY_ID=${surveyId}. Shape stays live; fix the fixture.`,
        };
      }
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: detail.survey.title || "Declaration detail",
        shape: "live",
        node: <OperatorDeclarationDetailView detail={detail} />,
      };
    }
    case "client-home-login": {
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Lynx Morphor landing",
        shape: "live",
        node: <LynxLandingPage signInHref={AUTH_SIGN_IN_HREF} />,
      };
    }
    default: {
      const _exhaustive: never = screenId;
      return {
        status: "live-embed-only",
        screenId: _exhaustive,
        label: gate.label,
        path: gate.path,
        shape: "live",
        reason: "Unhandled composition id.",
      };
    }
  }
}
