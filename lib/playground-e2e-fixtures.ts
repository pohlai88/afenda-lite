import { portalCopy } from "@/lib/portal-copy";
import {
  buildPlaygroundEmbedUrl,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
} from "@/lib/playground-registry";

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
    iframeMarker: /declaration workspace/i,
  },
  "client-onboarding": {
    iframeMarker: /establish your declarant identity|complete your profile/i,
  },
  "client-profile": {
    iframeMarker: /declarant profile/i,
  },
  "client-preview-unavailable": {
    iframeMarker: /preview not available|preview unavailable/i,
  },
  "client-declare": {
    iframeMarker: /submit|declaration|assignment/i,
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
