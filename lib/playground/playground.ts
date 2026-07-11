import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
  resolvePlaygroundRouteFile,
} from "@/lib/playground/playground-registry";

export type PlaygroundScreen = {
  id: string;
  category: "admin" | "client" | "dynamic" | "hot-sales" | "auto";
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
} from "@/lib/playground/playground-registry";
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

export const playgroundNav = {
  admin: playgroundScreens.filter((screen) => screen.category === "admin"),
  client: playgroundScreens.filter((screen) => screen.category === "client"),
  dynamic: playgroundScreens.filter((screen) => screen.category === "dynamic"),
  "hot-sales": playgroundScreens.filter(
    (screen) => screen.category === "hot-sales",
  ),
  auto: playgroundScreens.filter((screen) => screen.category === "auto"),
};

export function getPlaygroundScreen(id: string) {
  return playgroundScreens.find((screen) => screen.id === id);
}

export function getPlaygroundScreenIds() {
  return playgroundScreens.map((screen) => screen.id);
}
