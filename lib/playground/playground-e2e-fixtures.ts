import { portalCopy } from "@/lib/copy/portal-copy";
import {
  buildPlaygroundEmbedUrl,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
} from "@/lib/playground/playground-registry";

export type PlaygroundE2eFixture = {
  id: string;
  label: string;
  path: string;
  embedUrl: string;
  iframeMarker: RegExp;
  requiredHeading?: RegExp;
};

/** E2E-only assertions keyed by playground screen id. */
const e2eAssertions: Record<
  string,
  { iframeMarker: RegExp; requiredHeading?: RegExp }
> = {
  "admin-dashboard": {
    iframeMarker: /declaration management|create declaration|declarations/i,
  },
  "admin-clients": {
    iframeMarker: /client registrations|register client/i,
  },
  "admin-survey-detail": {
    iframeMarker: /submissions|share access|declaration/i,
  },
  "client-home-login": {
    iframeMarker: /sign in|organization sign in/i,
    requiredHeading: /sign in/i,
  },
  "client-named-login": {
    iframeMarker: /sign in|organization sign in/i,
  },
  "client-org-login": {
    iframeMarker: /organization sign in/i,
    requiredHeading: /organization sign in/i,
  },
  "client-auth-admin-legacy": {
    iframeMarker: /organization sign in/i,
  },
  "client-org-access-denied": {
    iframeMarker: new RegExp(portalCopy.accessDenied.title, "i"),
  },
  "client-dashboard": {
    iframeMarker: new RegExp(portalCopy.clientWorkspace.unavailableTitle, "i"),
  },
  "client-onboarding": {
    iframeMarker: new RegExp(portalCopy.clientOnboarding.unavailableTitle, "i"),
  },
  "client-profile": {
    iframeMarker: new RegExp(portalCopy.clientWorkspace.unavailableTitle, "i"),
  },
  "client-preview-unavailable": {
    iframeMarker: /preview not available|preview unavailable/i,
  },
  "client-declare": {
    iframeMarker: new RegExp(portalCopy.clientWorkspace.unavailableTitle, "i"),
  },
  "auth-sign-in": {
    iframeMarker: /sign in/i,
    requiredHeading: /sign in/i,
  },
  "account-security": {
    iframeMarker: /security|password/i,
  },
  "not-found": {
    iframeMarker: new RegExp(portalCopy.notFound.title, "i"),
  },
  "dynamic-dashboard-id": {
    iframeMarker: /submissions|share access|declaration/i,
  },
  "dynamic-declare-id": {
    iframeMarker: new RegExp(portalCopy.clientWorkspace.unavailableTitle, "i"),
  },
  "dynamic-auth-sign-up": {
    iframeMarker: /sign up|create account/i,
  },
  "dynamic-auth-email-otp": {
    iframeMarker: /verification|otp|code/i,
  },
  "dynamic-auth-forgot-password": {
    iframeMarker: /forgot password|reset/i,
  },
  "dynamic-auth-reset-password": {
    iframeMarker: /reset password|new password/i,
  },
  "dynamic-auth-magic-link": {
    iframeMarker: /magic link|email/i,
  },
  "dynamic-auth-accept-invitation": {
    iframeMarker: /invitation|accept|organization/i,
  },
  "dynamic-auth-sign-out": {
    iframeMarker: /sign in|sign out|organization sign in/i,
  },
  "dynamic-account-settings": {
    iframeMarker: /settings|account|name/i,
  },
  "dynamic-account-security": {
    iframeMarker: /security|password/i,
  },
  "dynamic-public-survey-slug": {
    iframeMarker: /sign in|declaration|survey/i,
  },
  "dynamic-public-secure-token": {
    iframeMarker: /sign in|secure|link/i,
  },
  "dynamic-legacy-invite-token": {
    iframeMarker: /sign in|check your email|invitation/i,
  },
  "dynamic-client-join": {
    iframeMarker: /join|invitation|sign up|organization/i,
  },
  "account-index": {
    iframeMarker: /account|settings|security/i,
  },
  "hot-sales-trade-index": {
    iframeMarker: /trade|events|sign in|declaration workspace/i,
  },
  "hot-sales-events": {
    iframeMarker: /event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-my-orders": {
    iframeMarker: /order|trade|sign in|declaration workspace/i,
  },
  "hot-sales-event-order": {
    iframeMarker: /order|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-events": {
    iframeMarker: /event|admin|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-events-new": {
    iframeMarker: /event|admin|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-event-setup": {
    iframeMarker: /setup|event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-event-allocation": {
    iframeMarker: /allocation|event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-event-deposits": {
    iframeMarker: /deposit|event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-event-imports": {
    iframeMarker: /import|event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-event-pickup": {
    iframeMarker: /pickup|event|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-erp-sync": {
    iframeMarker: /erp|sync|trade|sign in|declaration workspace/i,
  },
  "hot-sales-admin-rbac": {
    iframeMarker: /rbac|role|trade|sign in|declaration workspace/i,
  },
};

function buildPlaygroundE2eFixture(
  screen: (typeof playgroundScreenDefs)[number],
): PlaygroundE2eFixture | null {
  const assertions = e2eAssertions[screen.id];
  if (!assertions) {
    return null;
  }

  const path = resolvePlaygroundPathTemplate(screen.path);
  return {
    id: screen.id,
    label: screen.label,
    path,
    embedUrl: buildPlaygroundEmbedUrl(path),
    iframeMarker: assertions.iframeMarker,
    ...(assertions.requiredHeading
      ? { requiredHeading: assertions.requiredHeading }
      : {}),
  };
}

export const playgroundE2eFixtures: PlaygroundE2eFixture[] =
  playgroundScreenDefs.flatMap((screen) => {
    const fixture = buildPlaygroundE2eFixture(screen);
    return fixture ? [fixture] : [];
  });

export function getPlaygroundE2eFixture(id: string) {
  return playgroundE2eFixtures.find((screen) => screen.id === id);
}

export function isPlaygroundEnabledForTests() {
  return process.env.PLAYGROUND_ENABLED === "true";
}

export const playgroundSkipMessage =
  "Set PLAYGROUND_ENABLED=true and operator credentials for playground E2E";
