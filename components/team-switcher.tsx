"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  type DashboardTeam,
  resolveActiveTeam,
} from "@/lib/dashboard-nav";
import { startClientPreviewAction } from "@/app/actions/admin";
import { ChevronsUpDownIcon } from "lucide-react";

export function TeamSwitcher({ teams }: { teams: DashboardTeam[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(() =>
    resolveActiveTeam(pathname, teams),
  );
  const [isSwitching, setIsSwitching] = React.useState(false);

  React.useEffect(() => {
    setActiveTeam(resolveActiveTeam(pathname, teams));
  }, [pathname, teams]);

  async function selectTeam(team: DashboardTeam) {
    setActiveTeam(team);

    if (team.usePreviewAction) {
      setIsSwitching(true);
      try {
        await startClientPreviewAction();
      } finally {
        setIsSwitching(false);
      }
      return;
    }

    router.push(team.href);
  }

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                disabled={isSwitching}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="center size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs">{activeTeam.plan}</span>
            </div>
            <ChevronsUpDownIcon aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch context
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.name}
                  disabled={isSwitching}
                  onClick={() => void selectTeam(team)}
                  className="gap-2 p-2"
                >
                  <div className="center size-6 rounded-md border">
                    {team.logo}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{team.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {team.plan}
                    </p>
                  </div>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/")}
              >
                <div className="center size-6 rounded-md border bg-transparent">
                  <span className="text-xs font-medium">↗</span>
                </div>
                <span className="font-medium text-muted-foreground">
                  Open public home
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
