"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGridIcon, SearchIcon } from "lucide-react";

import type { PlaygroundScreen } from "@/features/playground/playground";
import {
  PLAYGROUND_COVERAGE_HREF,
  PLAYGROUND_HREF,
  PLAYGROUND_HITL_REVIEW_HREF,
} from "@/features/playground/playground-nav";
import { playgroundScreenHref } from "@/modules/platform/routing/portal-routes";
import { useSettings } from "@/components-V2/platform-hooks/use-settings";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components-V2/platform-components/ui/sidebar";

function matchesPlaygroundQuery(
  query: string,
  ...haystacks: Array<string | undefined>
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return haystacks.some((value) => value?.toLowerCase().includes(normalized));
}

function filterScreens(screens: PlaygroundScreen[], query: string) {
  return screens.filter((screen) =>
    matchesPlaygroundQuery(query, screen.label, screen.path, screen.id),
  );
}

function PlaygroundNavGroup({
  label,
  screens,
  activeId,
}: {
  label: string;
  screens: PlaygroundScreen[];
  activeId?: string;
}) {
  if (screens.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {screens.map((screen) => (
            <SidebarMenuItem key={screen.id}>
              <SidebarMenuButton
                isActive={screen.id === activeId}
                render={<Link href={playgroundScreenHref(screen.id)} />}
                tooltip={screen.label}
              >
                <span className="truncate">{screen.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Developer sidebar for `/playground/*` — same AdminCN Sidebar settings
 * (variant / collapsible) as product chrome; content only differs.
 */
export function PlaygroundSidebar({
  adminScreens,
  clientScreens,
  dynamicScreens,
  hotSalesScreens = [],
  autoScreens = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  adminScreens: PlaygroundScreen[];
  clientScreens: PlaygroundScreen[];
  dynamicScreens: PlaygroundScreen[];
  hotSalesScreens?: PlaygroundScreen[];
  autoScreens?: PlaygroundScreen[];
}) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [query, setQuery] = useState("");
  const activeId = pathname.startsWith("/playground/")
    ? pathname.replace("/playground/", "").split("/")[0]
    : undefined;

  // Match product Sidebar: icon mode while open so the header trigger works.
  const collapsibleMode = settings.sidebarOpen ? "icon" : settings.collapsible;
  const variant =
    settings.variant === "default" ? "sidebar" : settings.variant;

  const filtered = useMemo(
    () => ({
      admin: filterScreens(adminScreens, query),
      client: filterScreens(clientScreens, query),
      dynamic: filterScreens(dynamicScreens, query),
      hotSales: filterScreens(hotSalesScreens, query),
      auto: filterScreens(autoScreens, query),
      routeReview: matchesPlaygroundQuery(
        query,
        "Route review",
        "hitl",
        "shape",
        PLAYGROUND_HITL_REVIEW_HREF,
      ),
      routeCoverage: matchesPlaygroundQuery(
        query,
        "Route coverage",
        "coverage",
        "registry",
        PLAYGROUND_COVERAGE_HREF,
      ),
      operatorDashboard: matchesPlaygroundQuery(
        query,
        "Operator dashboard",
        "dashboard",
        "/dashboard",
      ),
    }),
    [
      adminScreens,
      clientScreens,
      dynamicScreens,
      hotSalesScreens,
      autoScreens,
      query,
    ],
  );

  const hasScreenMatches =
    filtered.admin.length +
      filtered.client.length +
      filtered.dynamic.length +
      filtered.hotSales.length +
      filtered.auto.length >
    0;
  const hasReviewMatches =
    filtered.routeReview || filtered.routeCoverage || filtered.operatorDashboard;
  const showEmpty = query.trim().length > 0 && !hasScreenMatches && !hasReviewMatches;

  return (
    <Sidebar collapsible={collapsibleMode} variant={variant} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href={PLAYGROUND_HREF} />}
              tooltip="Playground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <LayoutGridIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">Playground</span>
                <span className="truncate text-xs text-muted-foreground">
                  UI review
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="relative px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2"
            aria-hidden="true"
          />
          <SidebarInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages…"
            aria-label="Search playground pages"
            className="pl-8"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
        {showEmpty ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <p className="text-muted-foreground px-2 py-3 text-xs">
                No pages match “{query.trim()}”.
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {hasReviewMatches ? (
          <SidebarGroup>
            <SidebarGroupLabel>Review</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filtered.routeReview ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === PLAYGROUND_HITL_REVIEW_HREF}
                      render={<Link href={PLAYGROUND_HITL_REVIEW_HREF} />}
                      tooltip="Route review"
                    >
                      <span>Route review</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {filtered.routeCoverage ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === PLAYGROUND_COVERAGE_HREF}
                      render={<Link href={PLAYGROUND_COVERAGE_HREF} />}
                      tooltip="Route coverage"
                    >
                      <span>Route coverage</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                {filtered.operatorDashboard ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={
                        pathname === "/dashboard" ||
                        pathname.startsWith("/dashboard/")
                      }
                      render={<Link href="/dashboard" />}
                      tooltip="Operator dashboard"
                    >
                      <span>Operator dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <PlaygroundNavGroup
          label="Admin"
          screens={filtered.admin}
          activeId={activeId}
        />
        <PlaygroundNavGroup
          label="Client"
          screens={filtered.client}
          activeId={activeId}
        />
        <PlaygroundNavGroup
          label="Dynamic routes"
          screens={filtered.dynamic}
          activeId={activeId}
        />
        <PlaygroundNavGroup
          label="Feed Farm Trade"
          screens={filtered.hotSales}
          activeId={activeId}
        />
        <PlaygroundNavGroup
          label="All other routes"
          screens={filtered.auto}
          activeId={activeId}
        />
      </SidebarContent>
    </Sidebar>
  );
}
