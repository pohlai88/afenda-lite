import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { TeamSwitcher } from "@/components/team-switcher";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { DashboardTeam } from "@/lib/dashboard-nav";
import { portalCopy } from "@/lib/copy/portal-copy";
import { renderPortal, setupUser } from "@/testing/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push }),
}));

vi.mock("@/app/actions/admin", () => ({
  startClientPreviewAction: vi.fn(),
}));

const teams: DashboardTeam[] = [
  {
    name: "operator",
    memberLabel: "Portal Operator",
    memberEmail: "operator@example.com",
    plan: portalCopy.nav.organization,
    href: "/dashboard",
    logo: <span aria-hidden="true">O</span>,
    matchPrefixes: ["/dashboard"],
  },
  {
    name: "client-preview",
    memberLabel: "Preview Client",
    memberEmail: "client@example.com",
    plan: "Declarations",
    href: "/client",
    logo: <span aria-hidden="true">C</span>,
    matchPrefixes: ["/client"],
    usePreviewAction: true,
  },
];

describe("TeamSwitcher", () => {
  it("opens context menu and lists switch options", async () => {
    const user = setupUser();

    renderPortal(
      <SidebarProvider>
        <TeamSwitcher teams={teams} />
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /portal operator/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Switch context")).toBeInTheDocument();
    });
    expect(screen.getByRole("menuitem", { name: /preview client/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /open public home/i })).toBeInTheDocument();
  });
});
