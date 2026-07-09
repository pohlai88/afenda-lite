import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
  resolvePlaygroundRouteFile,
} from "@/lib/playground/playground-registry";
import type { PlaygroundScreen } from "@/lib/playground/playground";
import { playgroundScreenHref } from "@/lib/routing/portal-routes";

export type PlaygroundHitlRow = {
  id: string;
  category: PlaygroundScreen["category"];
  label: string;
  path: string;
  routeFile: string | null;
  pathConfigured: boolean;
  playgroundHref: string;
  embedHref: string;
};

export function buildPlaygroundHitlRows(
  screens: PlaygroundScreen[],
): PlaygroundHitlRow[] {
  return screens.map((screen) => ({
    id: screen.id,
    category: screen.category,
    label: screen.label,
    path: screen.path,
    routeFile:
      screen.routeFile ?? resolvePlaygroundRouteFile(screen.path) ?? null,
    pathConfigured: isPlaygroundScreenPathConfigured(screen.path),
    playgroundHref: playgroundScreenHref(screen.id),
    embedHref: buildPlaygroundEmbedUrl(screen.path),
  }));
}

export const PLAYGROUND_HITL_STORAGE_KEY = "portal-playground-hitl-v1";
