import { redirect } from "next/navigation";
import { playgroundScreens } from "@/lib/playground";
import {
  OPERATOR_DASHBOARD_HREF,
  playgroundScreenHref,
} from "@/lib/portal-routes";

export const dynamic = "force-dynamic";

export default function PlaygroundIndexPage() {
  const firstScreen = playgroundScreens[0];
  if (!firstScreen) {
    redirect(OPERATOR_DASHBOARD_HREF);
  }

  redirect(playgroundScreenHref(firstScreen.id));
}
