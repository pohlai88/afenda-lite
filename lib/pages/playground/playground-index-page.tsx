import "server-only";

import { redirect } from "next/navigation";
import { playgroundScreens } from "@/lib/playground/playground";
import {
  OPERATOR_DASHBOARD_HREF,
  playgroundScreenHref,
} from "@/lib/routing/portal-routes";

/** Shared page handler for `/playground`. */
export function runPlaygroundIndexPage(): never {
  const firstScreen = playgroundScreens[0];
  if (!firstScreen) {
    redirect(OPERATOR_DASHBOARD_HREF);
  }

  redirect(playgroundScreenHref(firstScreen.id));
}
