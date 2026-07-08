import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  playgroundScreenDefs,
  resolvePlaygroundPathTemplate,
  resolvePlaygroundRouteFile,
} from "@/lib/playground-registry";

export type PlaygroundScreen = {
  id: string;
  category: "admin" | "client" | "dynamic";
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
} from "@/lib/playground-registry";

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

/** Playground iframe: `?embed=1` on public routes and/or proxy `x-playground-embed` header. */
export async function resolvePlaygroundEmbedActive(
  searchParams?: { embed?: string | string[] | undefined },
): Promise<boolean> {
  if (searchParams && isPlaygroundEmbed(searchParams)) {
    return true;
  }

  return isPlaygroundEmbedRequest();
}

export function appendPlaygroundEmbedQuery(href: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}embed=1`;
}

export function getPlaygroundScreen(id: string) {
  return playgroundScreens.find((screen) => screen.id === id);
}

export function getPlaygroundScreenIds() {
  return playgroundScreens.map((screen) => screen.id);
}
