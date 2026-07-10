import type { Meta, StoryObj } from "@storybook/react";
import {
  ApplicationShell05Layout,
  ApplicationShell05Page,
  ApplicationShell05Sidebar,
  applicationShell05NextLink,
} from "@/components/V2/application-shell-5";
import { SidebarUserDropdown } from "@/components/V2/application-shell-5/sidebar-user-dropdown";
import {
  ApplicationShell05Placeholder,
  ApplicationShellSamplePageContent,
  applicationShell05DemoHeader,
  applicationShell05DemoUser,
  buildDemoFooterConfig,
  buildDemoSidebarConfig,
  buildPortalSidebarConfig,
  buildStudioSidebarConfigViaPageProp,
  pageContentBreadcrumbs,
  portalClientsBreadcrumbs,
  portalOperatorBreadcrumbs,
  portalOperatorBrand,
  portalOperatorNavGroups,
} from "./application-shell-05.fixtures";
import { buildPortalShellFooterConfig } from "@/components/portal/portal-application-shell";

const demoSidebarConfig = buildDemoSidebarConfig();
const demoFooterConfig = buildDemoFooterConfig();

const meta = {
  title: "UI Evaluation/Application Shell 05",
  component: ApplicationShell05Page,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "R1-aligned Shadcn Studio application-shell-05 in `components/V2/application-shell-5/`. " +
          "Chrome blocks live in `components/shadcn-studio/blocks/`. " +
          "Pass `sidebarConfig`, `header`, `footer`, and `renderLink` (`applicationShell05NextLink`) for production-style wiring.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    sidebarConfig: demoSidebarConfig,
    profileUser: applicationShell05DemoUser,
    header: { greeting: "Hey, John" },
    footer: demoFooterConfig,
    showStudioChrome: true,
  },
} satisfies Meta<typeof ApplicationShell05Page>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Studio default — striped placeholder cards when `children` is omitted. */
export const StudioPlaceholder: Story = {
  name: "Studio placeholder",
  render: (args) => (
    <ApplicationShell05Page {...args}>
      <ApplicationShell05Placeholder />
    </ApplicationShell05Page>
  ),
  parameters: {
    docs: {
      description: {
        story: "Studio demo nav from story fixtures with R1 striped main placeholders.",
      },
    },
  },
};

/** Typical route — custom main content + breadcrumb trail. */
export const WithPageContent: Story = {
  name: "With page content",
  render: (args) => (
    <ApplicationShell05Page
      {...args}
      footer={buildDemoFooterConfig(pageContentBreadcrumbs)}
    >
      <ApplicationShellSamplePageContent />
    </ApplicationShell05Page>
  ),
  parameters: {
    docs: {
      description: {
        story: "Page entry with caller-owned main region. Hero greeting derives from `profileUser.name`.",
      },
    },
  },
};

/** Light toolbar theme — baseline for hero gradient + dark floating sidebar. */
export const LightTheme: Story = {
  ...StudioPlaceholder,
  name: "Light theme",
  globals: { theme: "light" },
  parameters: {
    docs: {
      description: {
        story: "Light canvas with dark floating sidebar and primary hero gradient (Studio shell-05 light).",
      },
    },
  },
};

/** Dark toolbar theme — white sidebar card on light-blue canvas. */
export const DarkTheme: Story = {
  ...StudioPlaceholder,
  name: "Dark theme",
  globals: { theme: "dark" },
  parameters: {
    docs: {
      description: {
        story: "Dark toolbar applies shell dark tokens — white sidebar, light-blue canvas gradient.",
      },
    },
  },
};

/** Comp benchmark width from portal-atmosphere ADR. */
export const Laptop1024: Story = {
  ...WithPageContent,
  name: "Laptop 1024",
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    docs: {
      description: {
        story: "1024px width — primary UI evaluation breakpoint for shell chrome and hero layout.",
      },
    },
  },
};

/** Custom greeting override (default still derives first name from `profileUser`). */
export const CustomGreeting: Story = {
  name: "Custom greeting",
  render: (args) => (
    <ApplicationShell05Page
      {...args}
      header={{ greeting: "Hey, Operator" }}
      footer={buildPortalShellFooterConfig({ breadcrumbs: portalOperatorBreadcrumbs })}
    >
      <p className="text-sm text-muted-foreground">
        `header.greeting` overrides the auto greeting from `profileUser.name`.
      </p>
    </ApplicationShell05Page>
  ),
};

/** Low-level layout API — caller composes sidebar + layout directly. */
export const InjectableNavLayout: Story = {
  name: "Injectable nav (layout)",
  render: () => (
    <ApplicationShell05Layout
      header={{ greeting: "Hey, John" }}
      footer={buildPortalShellFooterConfig({ breadcrumbs: portalOperatorBreadcrumbs })}
      profileUser={applicationShell05DemoUser}
      renderLink={applicationShell05NextLink}
      showStudioChrome
      sidebar={
        <ApplicationShell05Sidebar
          brand={portalOperatorBrand}
          navGroups={portalOperatorNavGroups}
          footer={<SidebarUserDropdown user={applicationShell05DemoUser} />}
          renderLink={applicationShell05NextLink}
        />
      }
    >
      <ApplicationShellSamplePageContent
        title="Injectable sidebar preview"
        description="ApplicationShell05Layout + ApplicationShell05Sidebar with portal-style nav groups."
        cards={["Declarations", "Clients"]}
      />
    </ApplicationShell05Layout>
  ),
  parameters: {
    docs: {
      description: {
        story: "Compose `ApplicationShell05Layout` and `ApplicationShell05Sidebar` without the page wrapper.",
      },
    },
  },
};

/** Page-level `sidebarConfig` — preferred prod entry when using ApplicationShell05Page. */
export const InjectableNavViaPageProp: Story = {
  name: "Injectable nav (page prop)",
  render: (args) => (
    <ApplicationShell05Page
      {...args}
      footer={buildDemoFooterConfig(portalClientsBreadcrumbs)}
      sidebarConfig={buildStudioSidebarConfigViaPageProp()}
    >
      <p className="text-sm text-muted-foreground">
        `sidebarConfig` overrides demo fixtures while keeping the same page entry point.
      </p>
    </ApplicationShell05Page>
  ),
  parameters: {
    docs: {
      description: {
        story: "Operator nav preview via `sidebarConfig` on `ApplicationShell05Page`.",
      },
    },
  },
};

/** Full portal operator preview — brand, nav, Next.js links, breadcrumbs. */
/** Portal footer — IAM identity + breadcrumb via adapter (prod-like, no Studio header chrome). */
export const PortalFooter: Story = {
  name: "Portal footer",
  args: {
    showStudioChrome: false,
  },
  render: (args) => (
    <ApplicationShell05Page
      {...args}
      sidebarConfig={buildPortalSidebarConfig()}
      footer={buildPortalShellFooterConfig({
        breadcrumbs: [
          { label: "Organization", href: "/dashboard" },
          { label: "Declarations" },
        ],
      })}
    >
      <ApplicationShellSamplePageContent title="Portal footer" />
    </ApplicationShell05Page>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Production-style footer: `buildPortalShellFooterConfig` supplies IAM identity + breadcrumb. Hero breadcrumbs removed.",
      },
    },
  },
};

export const PortalOperatorPreview: Story = {
  name: "Portal operator preview",
  render: (args) => (
    <ApplicationShell05Page
      {...args}
      showStudioChrome={false}
      footer={buildPortalShellFooterConfig({ breadcrumbs: portalOperatorBreadcrumbs })}
      sidebarConfig={buildPortalSidebarConfig()}
    >
      <ApplicationShellSamplePageContent
        title="Operator workspace"
        description="Portal nav groups + `applicationShell05NextLink` — pattern for future `/dashboard` adoption."
        cards={["Declarations", "Client invitations"]}
      />
    </ApplicationShell05Page>
  ),
  parameters: {
    docs: {
      description: {
        story: "End-state preview wiring portal brand, operator nav, and Next.js link renderer.",
      },
    },
  },
};
