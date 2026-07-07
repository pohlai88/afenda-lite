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
            {activeTeam.logo}
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{activeTeam.memberLabel}</span>
              <span className="truncate text-xs text-muted-foreground">
                {activeTeam.plan}
              </span>
            </div>
            <ChevronsUpDownIcon
              aria-hidden="true"
              className="ml-auto group-data-[collapsible=icon]:hidden"
            />
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
                  <div className="flex size-8 shrink-0 items-center justify-center">
                    {team.logo}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{team.memberLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {team.memberEmail ?? team.plan}
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
