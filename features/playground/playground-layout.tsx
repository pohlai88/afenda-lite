import "server-only";

import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AdminShellProviders } from "@/components-V2/platform-components/AdminShellProviders";
import PagesLayout from "@/components-V2/platform-components/layout/PagesLayout";
import themeConfig from "@/components-V2/platform-config/themeConfig";
import type { Settings } from "@/components-V2/platform-context/settingsContext";
import { PlaygroundSidebar } from "@/features/playground/playground-sidebar";
import { buildPlaygroundScreensWithAutoDiscovery } from "@/features/playground/playground-auto-discovery";
import { groupPlaygroundNav, isPlaygroundEnabled } from "@/features/playground/playground";
import { requireAdminSession } from "@/modules/identity/auth/session";

/**
 * `/playground` layout — same AdminCN shell as /dashboard (`PagesLayout`),
 * with playground screen nav swapped into the sidebar slot.
 */
export async function runPlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAdminSession();

  const cookieStore = await cookies();
  const raw = cookieStore.get(themeConfig.settingsCookieName)?.value;
  let settingsCookie: Settings | undefined;
  if (raw) {
    try {
      settingsCookie = JSON.parse(raw) as Settings;
    } catch {
      settingsCookie = undefined;
    }
  }

  const sidebarDefaultOpen =
    settingsCookie?.sidebarOpen ?? themeConfig.sidebarOpen;

  const playgroundNav = groupPlaygroundNav(
    buildPlaygroundScreensWithAutoDiscovery(),
  );

  return (
    <AdminShellProviders
      settingsCookie={settingsCookie}
      sidebarDefaultOpen={sidebarDefaultOpen}
      showPlayground
    >
      <PagesLayout
        sidebar={
          <PlaygroundSidebar
            adminScreens={playgroundNav.admin}
            clientScreens={playgroundNav.client}
            dynamicScreens={playgroundNav.dynamic}
            hotSalesScreens={playgroundNav.fft}
            autoScreens={playgroundNav.auto}
          />
        }
      >
        {children}
      </PagesLayout>
    </AdminShellProviders>
  );
}
