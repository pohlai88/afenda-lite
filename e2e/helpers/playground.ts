import { portalCopy } from "../../lib/portal-copy";

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolvePath(template: string) {
  return template
    .replace("{PLAYGROUND_SURVEY_ID}", env("PLAYGROUND_SURVEY_ID"))
    .replace("{PLAYGROUND_ASSIGNMENT_ID}", env("PLAYGROUND_ASSIGNMENT_ID"))
    .replace("{PLAYGROUND_SURVEY_SLUG}", env("PLAYGROUND_SURVEY_SLUG"));
}

export type PlaygroundScreenFixture = {
  id: string;
  label: string;
  path: string;
  embedUrl: string;
  iframeMarker: RegExp;
  requiredHeading?: RegExp;
};

function buildEmbedUrl(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}embed=1`;
}

const screenDefs = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    path: "/dashboard",
    iframeMarker: /declaration management|create declaration|declarations/i,
  },
  {
    id: "admin-clients",
    label: "Clients",
    path: "/dashboard/clients",
    iframeMarker: /client invitations|invite clients/i,
  },
  {
    id: "admin-survey-detail",
    label: "Survey detail",
    path: "/dashboard/{PLAYGROUND_SURVEY_ID}",
    iframeMarker: /submissions|share access|declaration/i,
  },
  {
    id: "client-home-login",
    label: "Home / client login",
    path: "/",
    iframeMarker: /sign in|organization sign in/i,
    requiredHeading: /sign in/i,
  },
  {
    id: "client-org-login",
    label: "Org login",
    path: "/org/login",
    iframeMarker: /organization sign in/i,
    requiredHeading: /organization sign in/i,
  },
  {
    id: "client-org-access-denied",
    label: "Org access denied",
    path: "/org/login?reason=access-denied",
    iframeMarker: new RegExp(portalCopy.accessDenied.title, "i"),
  },
  {
    id: "client-dashboard",
    label: "Client dashboard",
    path: "/client",
    iframeMarker: /declaration workspace/i,
  },
  {
    id: "client-onboarding",
    label: "Client onboarding",
    path: "/client/onboarding",
    iframeMarker: /complete your profile/i,
  },
  {
    id: "client-declare",
    label: "Declaration form",
    path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
    iframeMarker: /submit|declaration|assignment/i,
  },
  {
    id: "client-public-survey",
    label: "Public survey",
    path: "/survey/{PLAYGROUND_SURVEY_SLUG}",
    iframeMarker: /submit/i,
  },
] as const;

export const playgroundScreenFixtures: PlaygroundScreenFixture[] = screenDefs.map(
  (screen) => {
    const path = resolvePath(screen.path);
    return {
      id: screen.id,
      label: screen.label,
      path,
      embedUrl: buildEmbedUrl(path),
      iframeMarker: screen.iframeMarker,
      requiredHeading:
        "requiredHeading" in screen ? screen.requiredHeading : undefined,
    };
  },
);

export function getPlaygroundFixture(id: string) {
  return playgroundScreenFixtures.find((screen) => screen.id === id);
}

export function isPlaygroundEnabledForTests() {
  return process.env.PLAYGROUND_ENABLED === "true";
}

export const playgroundSkipMessage =
  "Set PLAYGROUND_ENABLED=true and operator credentials for playground E2E";
