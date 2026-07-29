import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../src/blocks/app-shell-block/app-shell";
import { OrgSwitcher } from "../src/blocks/app-shell-block/org-switcher";
import { TeamSwitcher } from "../src/blocks/app-shell-block/team-switcher";
import { SidebarProvider } from "../src/components/ui/sidebar";

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.classList.remove("light", "dark");
	document.documentElement.style.colorScheme = "";
});

function TestLogo({ className }: { className?: string }) {
	return <svg aria-hidden="true" className={className} />;
}

function TestLink({
	"aria-current": ariaCurrent,
	children,
	href,
	rel,
	target,
}: {
	children: ReactNode;
	href: string;
	"aria-current"?: "page";
	rel?: string;
	target?: "_blank" | "_self";
}) {
	return (
		<a href={href} aria-current={ariaCurrent} rel={rel} target={target}>
			{children}
		</a>
	);
}

describe("app-shell switchers", () => {
	it("switches teams and exposes creation only when implemented", async () => {
		const user = userEvent.setup();
		const onTeamChange = vi.fn();
		const onCreateTeam = vi.fn();
		render(
			<SidebarProvider>
				<TeamSwitcher
					teams={[
						{ id: "finance", name: "Finance", logo: TestLogo },
						{ id: "operations", name: "Operations", logo: TestLogo },
					]}
					onTeamChange={onTeamChange}
					onCreateTeam={onCreateTeam}
				/>
			</SidebarProvider>,
		);

		await user.click(
			screen.getByRole("button", {
				name: "Switch team. Current team: Finance",
			}),
		);
		await user.click(screen.getByRole("menuitem", { name: "Operations" }));

		expect(onTeamChange).toHaveBeenCalledWith("operations");
		expect(
			screen.getByRole("button", {
				name: "Switch team. Current team: Operations",
			}),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", {
				name: "Switch team. Current team: Operations",
			}),
		);
		await user.click(screen.getByRole("menuitem", { name: "Add team" }));
		expect(onCreateTeam).toHaveBeenCalledOnce();
	});

	it("switches organizations using the default organization icon", async () => {
		const user = userEvent.setup();
		const onOrganizationChange = vi.fn();
		render(
			<SidebarProvider>
				<OrgSwitcher
					organizations={[
						{ id: "afenda", name: "Afenda" },
						{ id: "northwind", name: "Northwind" },
					]}
					onOrganizationChange={onOrganizationChange}
				/>
			</SidebarProvider>,
		);

		await user.click(
			screen.getByRole("button", {
				name: "Switch organization. Current organization: Afenda",
			}),
		);
		await user.click(screen.getByRole("menuitem", { name: "Northwind" }));

		expect(onOrganizationChange).toHaveBeenCalledWith("northwind");
		expect(
			screen.queryByRole("menuitem", { name: "Add organization" }),
		).toBeNull();
	});

	it("connects provider settings to the header, sidebar, and content layout", async () => {
		const user = userEvent.setup();
		render(
			<AppShell
				header={{ title: "Dashboard" }}
				themeConfig={{
					brand: { name: "Afenda", homeHref: "/" },
				}}
				navConfig={{
					currentPath: "/dashboard",
					linkComponent: TestLink,
					sections: [
						{
							id: "workspace",
							items: [
								{
									kind: "link",
									id: "dashboard",
									label: "Dashboard",
									href: "/dashboard",
								},
							],
						},
					],
				}}
				showScrollToTop={false}
			>
				<p>Workspace content</p>
			</AppShell>,
		);

		expect(
			screen
				.getAllByRole("link", { name: "Dashboard" })
				.find((element) => element instanceof HTMLAnchorElement),
		).toHaveAttribute("aria-current", "page");
		await user.click(
			screen.getByRole("button", { name: "Customize appearance" }),
		);
		await user.click(screen.getByLabelText("Compact"));
		expect(
			screen
				.getByText("Workspace content")
				.closest("[data-slot=app-shell-content]"),
		).toHaveClass("p-4");
		expect(
			screen
				.getByText("Workspace content")
				.closest('[data-slot="sidebar-inset"]'),
		).toContainElement(screen.getByText("Workspace content"));
	});

	it("resets every setting atomically to consumer defaults", async () => {
		const user = userEvent.setup();
		render(
			<AppShell
				header={{ title: "Dashboard" }}
				themeConfig={{ brand: { name: "Afenda", homeHref: "/" } }}
				navConfig={{
					currentPath: "/dashboard",
					linkComponent: TestLink,
					sections: [],
				}}
				defaultSettings={{
					mode: "dark",
					layout: "compact",
					sidebarVariant: "inset",
					sidebarCollapsible: "offcanvas",
					sidebarOpen: false,
				}}
				showScrollToTop={false}
			>
				<p>Controlled defaults</p>
			</AppShell>,
		);

		await user.click(
			screen.getByRole("button", { name: "Customize appearance" }),
		);
		await user.click(screen.getByRole("radio", { name: "Light" }));
		await user.click(screen.getByRole("radio", { name: "Full" }));
		await user.click(screen.getByRole("radio", { name: "Default" }));
		await user.click(screen.getByRole("radio", { name: "Icon" }));
		await user.click(screen.getByRole("button", { name: "Reset appearance" }));

		expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Compact" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Inset" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Off-canvas" })).toBeChecked();
		expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
			"data-state",
			"collapsed",
		);
		await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
	});

	it("keeps command access responsive and orders shell utilities consistently", () => {
		render(
			<AppShell
				header={{ title: "Dashboard" }}
				themeConfig={{
					brand: { name: "Afenda", homeHref: "/" },
				}}
				navConfig={{
					currentPath: "/dashboard",
					linkComponent: TestLink,
					sections: [],
				}}
				commandMenu={{ groups: [], onCommand: vi.fn() }}
				notifications={{
					notifications: [
						{
							id: "unread",
							category: "inbox",
							actor: { name: "Finance Ops", initials: "FO" },
							title: "requested review.",
							occurredAt: "Now",
							read: false,
						},
					],
				}}
				profile={{ name: "John Doe", initials: "JD" }}
				showScrollToTop={false}
			>
				<p>Workspace content</p>
			</AppShell>,
		);

		const header = screen
			.getByRole("button", { name: "Toggle Sidebar" })
			.closest("[data-slot=app-shell-header]");
		expect(header).not.toBeNull();
		expect(
			header?.querySelector("[data-slot=app-shell-command-area]"),
		).not.toHaveClass("hidden");

		const utilityLabels = Array.from(
			header?.querySelectorAll("button[aria-label]") ?? [],
		).map((button) => button.getAttribute("aria-label"));
		expect(utilityLabels).toEqual([
			"Open command menu",
			"Open notifications (1 unread)",
			"Toggle color mode",
			"Customize appearance",
			"Open profile menu for John Doe",
		]);
	});

	it("matches configured query links and secures external navigation", () => {
		render(
			<AppShell
				header={{ title: "Reports" }}
				themeConfig={{
					brand: { name: "Afenda", homeHref: "/" },
					sidebar: { groupLabelStyle: "uppercase" },
				}}
				navConfig={{
					currentPath: "/reports?period=2026-07&status=open",
					linkComponent: TestLink,
					sections: [
						{
							id: "reports",
							label: "Reports",
							items: [
								{
									kind: "link",
									id: "open-period",
									label: "Open period",
									href: "/reports?period=2026-07",
								},
								{
									kind: "link",
									id: "documentation",
									label: "Documentation",
									href: "https://docs.example.com",
								},
							],
						},
					],
				}}
				showScrollToTop={false}
			>
				<p>Reports workspace</p>
			</AppShell>,
		);

		expect(screen.getByRole("link", { name: "Open period" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
			"target",
			"_blank",
		);
		expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
			"rel",
			"noopener noreferrer",
		);
		const groupLabel = screen
			.getAllByText("Reports")
			.find((element) => element.dataset.slot === "sidebar-group-label");
		expect(groupLabel).toHaveClass("uppercase", "tracking-wider");
	});

	it("matches complete path segments and opens active branches after navigation", () => {
		const appShell = (currentPath: string) => (
			<AppShell
				header={{
					title: "Settings",
					showModeToggle: false,
					showThemeCustomiser: false,
				}}
				themeConfig={{ brand: { name: "Afenda", homeHref: "/" } }}
				navConfig={{
					currentPath,
					linkComponent: TestLink,
					sections: [
						{
							id: "workspace",
							items: [
								{ kind: "link", id: "home", label: "Home", href: "/" },
								{
									kind: "link",
									id: "settings",
									label: "Settings overview",
									href: "/settings",
									activePath: "/settings",
								},
								{
									kind: "link",
									id: "settings-old",
									label: "Legacy settings",
									href: "/settings-old",
								},
								{
									kind: "branch",
									id: "administration",
									label: "Administration",
									items: [
										{
											kind: "link",
											id: "security",
											label: "Security",
											href: "/settings/security",
										},
									],
								},
							],
						},
					],
				}}
				showScrollToTop={false}
			>
				<p>Settings content</p>
			</AppShell>
		);

		const view = render(appShell("/settings-old"));
		expect(
			screen.getByRole("link", { name: "Legacy settings" }),
		).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("link", { name: "Settings overview" }),
		).not.toHaveAttribute("aria-current");
		expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
			"aria-current",
		);

		view.rerender(appShell("/settings/security"));
		expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		expect(
			screen.getByRole("button", { name: "Administration" }),
		).toHaveAttribute("data-state", "open");
	});
});
