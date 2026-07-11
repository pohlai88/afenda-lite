import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
  resolvePlaygroundRouteFile,
} from "@/features/playground/playground-registry";

export type PlaygroundScreen = {
  id: string;
  category: "admin" | "client" | "dynamic" | "fft" | "auto";
  label: string;
  path: string;
  routeFile?: string;
};

export {
  buildPlaygroundEmbedUrl as buildEmbedUrl,
  isPlaygroundScreenPathConfigured,
  legacyFlatClientRouteFiles,
  playgroundRouteFiles,
  playgroundScreenDefs,
  resolvePlaygroundRouteFile,
} from "@/features/playground/playground-registry";
export {
  appendPlaygroundEmbedQuery,
  isPlaygroundEmbed,
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
  resolvePlaygroundEmbedActive,
} from "@/modules/platform/playground-embed";

export const playgroundScreens: PlaygroundScreen[] = playgroundScreenDefs.map(
  (screen) => ({
    ...screen,
    path: resolvePlaygroundPathTemplate(screen.path),
  }),
);

/** Group curated and/or auto-discovered screens for playground chrome. */
export function groupPlaygroundNav(screens: PlaygroundScreen[]) {
  return {
    admin: screens.filter((screen) => screen.category === "admin"),
    client: screens.filter((screen) => screen.category === "client"),
    dynamic: screens.filter((screen) => screen.category === "dynamic"),
    fft: screens.filter((screen) => screen.category === "fft"),
    auto: screens.filter((screen) => screen.category === "auto"),
  };
}

/** @deprecated Prefer groupPlaygroundNav(buildPlaygroundScreensWithAutoDiscovery()). */
export const playgroundNav = groupPlaygroundNav(playgroundScreens);

export function getPlaygroundScreen(id: string) {
  return playgroundScreens.find((screen) => screen.id === id);
}

export function getPlaygroundScreenIds() {
  return playgroundScreens.map((screen) => screen.id);
}
