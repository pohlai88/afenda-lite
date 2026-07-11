import "server-only";

import { redirect } from "next/navigation";
import { playgroundScreens } from "@/features/playground/playground";
import {
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
  playgroundScreenHref,
} from "@/modules/platform/routing/portal-routes";

/** Shared page handler for `/playground`. */
export function runPlaygroundIndexPage(): never {
  const firstScreen = playgroundScreens[0];
  if (!firstScreen) {
    redirect(ORGANIZATION_ADMIN_DASHBOARD_HREF);
  }

  redirect(playgroundScreenHref(firstScreen.id));
}
