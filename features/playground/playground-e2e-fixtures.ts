import { portalCopy } from "@/modules/platform/copy/portal-copy";
import {
  buildPlaygroundEmbedUrl,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
} from "@/features/playground/playground-registry";

export type PlaygroundE2eFixture = {
  id: string;
  label: string;
  path: string;
  embedUrl: string;
  iframeMarker: RegExp;
};

/** E2E-only assertions keyed by playground screen id. */
const e2eAssertions: Record<string, RegExp> = {
  "admin-dashboard": /declaration management|create declaration|declarations/i,
  "admin-clients": /client registrations|register client/i,
  "admin-users-list": /search user|add new user|preview data/i,
  "admin-users-view": /back to users list|ava rodriguez|projects list/i,
  "admin-survey-detail": /submissions|share access|declaration/i,
  "client-home-login": /open authentication|sign in/i,
  "client-named-login": /sign in|organization sign in/i,
  "client-org-login": /organization sign in|access vault/i,
  "client-auth-admin-legacy": /organization sign in|access vault/i,
  "client-org-access-denied": new RegExp(portalCopy.accessDenied.title, "i"),
  "client-dashboard": /client workspace/i,
  "client-onboarding": /onboarding/i,
  "client-profile": /profile/i,
  "client-preview-unavailable": /preview not available|preview unavailable/i,
  "client-declare": /declaration/i,
  "auth-sign-in": /sign in/i,
  "account-security": /security|password|account/i,
  "not-found": new RegExp(portalCopy.notFound.title, "i"),
  "dynamic-dashboard-id": /submissions|share access|declaration/i,
  "dynamic-declare-id": /declaration/i,
  "dynamic-auth-sign-up": /sign up|create account/i,
  "dynamic-auth-email-otp": /verification|otp|code/i,
  "dynamic-auth-forgot-password": /forgot password|reset/i,
  "dynamic-auth-reset-password": /sign in|reset password|new password/i,
  "dynamic-auth-magic-link": /magic link|email/i,
  "dynamic-auth-accept-invitation": /sign in|invitation|accept|organization/i,
  "dynamic-auth-sign-out": /sign in|sign out|organization sign in/i,
  "dynamic-account-settings": /settings|account|name/i,
  "dynamic-account-security": /security|password|account/i,
  "dynamic-public-survey-slug": /sign in|declaration|survey|not found/i,
  "dynamic-public-secure-token": /sign in|secure|link|not found/i,
  "dynamic-legacy-invite-token": /sign in|check your email|invitation/i,
  "dynamic-client-join": /join|invitation|sign up|organization/i,
  "account-index": /account|settings|security/i,
  "fft-trade-index": /trade|events|sign in|declaration workspace/i,
  "fft-events": /event|trade|sign in|declaration workspace/i,
  "fft-my-orders": /order|trade|sign in|declaration workspace/i,
  "fft-event-order": /order|trade|sign in|declaration workspace/i,
  "fft-admin-events": /event|admin|trade|sign in|declaration workspace/i,
  "fft-admin-events-new": /event|admin|trade|sign in|declaration workspace/i,
  "fft-admin-event-setup": /setup|event|trade|sign in|declaration workspace/i,
  "fft-admin-event-allocation": /allocation|event|trade|sign in|declaration workspace/i,
  "fft-admin-event-deposits": /deposit|event|trade|sign in|declaration workspace/i,
  "fft-admin-event-imports": /import|event|trade|sign in|declaration workspace/i,
  "fft-admin-event-pickup": /pickup|event|trade|sign in|declaration workspace/i,
  "fft-admin-erp-sync": /erp|sync|trade|sign in|declaration workspace/i,
  "fft-admin-rbac": /rbac|role|trade|sign in|declaration workspace/i,
};

function buildPlaygroundE2eFixture(
  screen: (typeof playgroundScreenDefs)[number],
): PlaygroundE2eFixture | null {
  const iframeMarker = e2eAssertions[screen.id];
  if (!iframeMarker) {
    return null;
  }

  const path = resolvePlaygroundPathTemplate(screen.path);
  return {
    id: screen.id,
    label: screen.label,
    path,
    embedUrl: buildPlaygroundEmbedUrl(path),
    iframeMarker,
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
