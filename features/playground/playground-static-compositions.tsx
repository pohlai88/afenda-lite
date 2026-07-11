import "server-only";

import type { ReactNode } from "react";

import OrganizationAdminClientsList from "@/components-V2/platform-views/portal-views/organization-admin-clients-list";
import OrganizationAdminDeclarationDetailView from "@/components-V2/platform-views/portal-views/organization-admin-declaration-detail";
import OrganizationAdminDeclarationsDashboard from "@/components-V2/platform-views/portal-views/organization-admin-declarations-dashboard";
import OrganizationAdminUsersList from "@/components-V2/platform-views/portal-views/organization-admin-users-list";
import OrganizationAdminUsersView from "@/components-V2/platform-views/portal-views/organization-admin-users-view";
import { LynxLandingPage } from "@/features/landing";
import { loadOrganizationAdminClientsPage } from "@/features/organization-admin/organization-admin-clients-page";
import { loadOrganizationAdminDashboardPage } from "@/features/organization-admin/organization-admin-dashboard-page";
import { loadOrganizationAdminDeclarationDetail } from "@/features/organization-admin/organization-admin-declaration-detail";
import {
  loadOrganizationAdminUsersPage,
  loadOrganizationAdminUserViewPage,
} from "@/features/organization-admin/organization-admin-users-page";
import {
  isPlaygroundStaticCompositionId,
  type PlaygroundStaticCompositionId,
} from "@/features/playground/playground-static-composition-ids";
import { playgroundEnv } from "@/features/playground/playground-registry";
import { resolvePlaygroundStaticInspectGate } from "@/features/playground/playground-static-inspect";
import type { PlaygroundPageShape } from "@/features/playground/playground-page-shape";
import {
  AUTH_SIGN_IN_HREF,
  AUTH_SIGN_UP_HREF,
} from "@/modules/platform/routing/portal-routes";

export {
  PLAYGROUND_STATIC_COMPOSITION_IDS,
  isPlaygroundStaticCompositionId,
  type PlaygroundStaticCompositionId,
} from "@/features/playground/playground-static-composition-ids";

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
      const data = await loadOrganizationAdminDashboardPage();
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Operator dashboard",
        shape: "live",
        node: <OrganizationAdminDeclarationsDashboard data={data} />,
      };
    }
    case "admin-clients": {
      const data = await loadOrganizationAdminClientsPage();
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Clients",
        shape: "live",
        node: <OrganizationAdminClientsList data={data} />,
      };
    }
    case "admin-users-list": {
      const data = await loadOrganizationAdminUsersPage();
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Users",
        shape: "live",
        node: <OrganizationAdminUsersList data={data} />,
      };
    }
    case "admin-users-view": {
      const data = await loadOrganizationAdminUserViewPage("user-001");
      if (!data.user) {
        return {
          status: "live-embed-only",
          screenId,
          label: gate.label,
          path: gate.path,
          shape: "live",
          reason: "Fixture user-001 is missing from organization-admin users page data.",
        };
      }
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: data.user.name,
        shape: "live",
        node: <OrganizationAdminUsersView user={data.user} />,
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
      const detail = await loadOrganizationAdminDeclarationDetail(surveyId);
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
        node: <OrganizationAdminDeclarationDetailView detail={detail} />,
      };
    }
    case "client-home-login": {
      return {
        status: "ready",
        screenId,
        kind: "page",
        title: "Lynx laptop landing",
        shape: "live",
        node: (
          <LynxLandingPage
            signInHref={AUTH_SIGN_IN_HREF}
            signUpHref={AUTH_SIGN_UP_HREF}
          />
        ),
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
