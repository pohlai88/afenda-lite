import type { PlaygroundScreenCategory } from "@/lib/playground/playground-registry";
import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
} from "@/lib/playground/playground-registry";
import type { PlaygroundScreen } from "@/lib/playground/playground";

export function playgroundScreenCategoryLabel(
  category: PlaygroundScreenCategory,
) {
  switch (category) {
    case "admin":
      return "Admin";
    case "client":
      return "Client";
    default:
      return "Dynamic route";
  }
}

export function buildPlaygroundScreenViewModel(screen: PlaygroundScreen) {
  return {
    screen,
    embedUrl: buildPlaygroundEmbedUrl(screen.path),
    pathConfigured: isPlaygroundScreenPathConfigured(screen.path),
    categoryLabel: playgroundScreenCategoryLabel(screen.category),
  };
}

export function resolvePlaygroundScreenMetadataTitle(
  screen: PlaygroundScreen | undefined,
  portalName: string,
) {
  return screen
    ? `${portalName} — Playground · ${screen.label}`
    : `${portalName} — Playground`;
}
