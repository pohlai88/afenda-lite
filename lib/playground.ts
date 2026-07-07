export type PlaygroundScreen = {
  id: string;
  category: "admin" | "client";
  label: string;
  path: string;
};

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolvePath(template: string) {
  return template
    .replace("{PLAYGROUND_SURVEY_ID}", env("PLAYGROUND_SURVEY_ID"))
    .replace("{PLAYGROUND_ASSIGNMENT_ID}", env("PLAYGROUND_ASSIGNMENT_ID"))
    .replace("{PLAYGROUND_SURVEY_SLUG}", env("PLAYGROUND_SURVEY_SLUG"));
}

const playgroundScreenDefs: (Omit<PlaygroundScreen, "path"> & {
  path: string;
})[] = [
    {
      id: "admin-dashboard",
      category: "admin",
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      id: "admin-clients",
      category: "admin",
      label: "Clients",
      path: "/dashboard/clients",
    },
    {
      id: "admin-survey-detail",
      category: "admin",
      label: "Survey detail",
      path: "/dashboard/{PLAYGROUND_SURVEY_ID}",
    },
    {
      id: "client-home-login",
      category: "client",
      label: "Home / client login",
      path: "/",
    },
    {
      id: "client-org-login",
      category: "client",
      label: "Org login",
      path: "/org/login",
    },
    {
      id: "client-org-access-denied",
      category: "client",
      label: "Org access denied",
      path: "/org/login?reason=access-denied",
    },
    {
      id: "client-dashboard",
      category: "client",
      label: "Client dashboard",
      path: "/client",
    },
    {
      id: "client-onboarding",
      category: "client",
      label: "Client onboarding",
      path: "/client/onboarding",
    },
    {
      id: "client-profile",
      category: "client",
      label: "Declarant profile",
      path: "/client/profile",
    },
    {
      id: "client-declare",
      category: "client",
      label: "Declaration form",
      path: "/client/declare/{PLAYGROUND_ASSIGNMENT_ID}",
    },
    {
      id: "client-public-survey",
      category: "client",
      label: "Public survey",
      path: "/survey/{PLAYGROUND_SURVEY_SLUG}",
    },
  ];

export const playgroundScreens: PlaygroundScreen[] = playgroundScreenDefs.map(
  (screen) => ({
    ...screen,
    path: resolvePath(screen.path),
  }),
);

export const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
};

export function isPlaygroundEnabled() {
  return process.env.PLAYGROUND_ENABLED === "true";
}

export function isPlaygroundEmbed(
  searchParams: { embed?: string | string[] | undefined },
) {
  const embed = searchParams.embed;
  return embed === "1" || (Array.isArray(embed) && embed.includes("1"));
}

export async function isPlaygroundEmbedRequest() {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  return headerList.get("x-playground-embed") === "1";
}

export function buildEmbedUrl(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}embed=1`;
}

export function getPlaygroundScreen(id: string) {
  return playgroundScreens.find((screen) => screen.id === id);
}

export function getPlaygroundScreenIds() {
  return playgroundScreens.map((screen) => screen.id);
}

export function isPlaygroundScreenPathConfigured(path: string) {
  if (!path || path.includes("{PLAYGROUND_")) {
    return false;
  }

  const [pathname] = path.split("?");
  if (pathname.endsWith("/") && pathname !== "/") {
    return false;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((segment) => segment.length === 0)) {
    return false;
  }

  return true;
}

/** Static map from resolved path patterns to app router page files. */
export const playgroundRouteFiles: Record<string, string> = {
  "/dashboard": "app/dashboard/page.tsx",
  "/dashboard/clients": "app/dashboard/clients/page.tsx",
  "/dashboard/{id}": "app/dashboard/[id]/page.tsx",
  "/": "app/page.tsx",
  "/org/login": "app/org/login/page.tsx",
  "/client": "app/client/page.tsx",
  "/client/onboarding": "app/client/onboarding/page.tsx",
  "/client/profile": "app/client/profile/page.tsx",
  "/client/declare/{id}": "app/client/declare/[id]/page.tsx",
  "/client/preview-unavailable": "app/client/preview-unavailable/page.tsx",
  "/survey/{slug}": "app/survey/[slug]/page.tsx",
};

export function resolvePlaygroundRouteFile(path: string) {
  const [pathname] = path.split("?");

  if (playgroundRouteFiles[pathname]) {
    return playgroundRouteFiles[pathname];
  }

  if (/^\/dashboard\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/dashboard/{id}"];
  }

  if (/^\/client\/declare\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/client/declare/{id}"];
  }

  if (/^\/survey\/[^/]+$/.test(pathname)) {
    return playgroundRouteFiles["/survey/{slug}"];
  }

  return null;
}

export { playgroundScreenDefs };
