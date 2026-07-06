import { redirect } from "next/navigation";
import { playgroundScreens } from "@/lib/playground";

export default function PlaygroundIndexPage() {
  const firstScreen = playgroundScreens[0];
  if (!firstScreen) {
    redirect("/dashboard");
  }

  redirect(`/playground/${firstScreen.id}`);
}
