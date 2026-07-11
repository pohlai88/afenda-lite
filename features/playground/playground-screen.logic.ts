import {
  buildPlaygroundEmbedUrl,
  isPlaygroundScreenPathConfigured,
} from "@/features/playground/playground-registry";
import {
  declaredPlaygroundPageShape,
  resolvePlaygroundPageShape,
} from "@/features/playground/playground-page-shape";
import type { PlaygroundScreen } from "@/features/playground/playground";
import type { PlaygroundScreenCategory } from "@/features/playground/playground-registry";

export function playgroundScreenCategoryLabel(
  category: PlaygroundScreenCategory,
) {
  switch (category) {
    case "admin":
      return "Admin";
    case "client":
      return "Client";
    case "fft":
      return "Feed Farm Trade";
    case "auto":
      return "Auto-discovered";
    default:
      return "Dynamic route";
  }
}

export function buildPlaygroundScreenViewModel(screen: PlaygroundScreen) {
  const pathConfigured = isPlaygroundScreenPathConfigured(screen.path);
  const shape = resolvePlaygroundPageShape(
    declaredPlaygroundPageShape(screen.id),
    pathConfigured,
  );

  return {
    screen,
    embedUrl: buildPlaygroundEmbedUrl(screen.path),
    pathConfigured,
    shape,
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
