import type { Meta, StoryObj } from "@storybook/react";
import { PortalLaptopHeroPreview } from "@/components/portal-atmosphere/fixtures/portal-laptop-hero-preview.fixture";

const REFERENCE_DARK = "/brand/heroes/auth-hero-dark.png";
const REFERENCE_LIGHT = "/brand/heroes/auth-hero-light.png";

const meta = {
  title: "Portal Atmosphere/Comp Laptop Hero",
  component: PortalLaptopHeroPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Comp-aligned laptop hero (v2) — Storybook fixture only.",
          `Dark reference: ${REFERENCE_DARK}`,
          `Light reference: ${REFERENCE_LIGHT}`,
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    theme: {
      control: "inline-radio",
      options: ["dark", "light"],
    },
  },
} satisfies Meta<typeof PortalLaptopHeroPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DarkLaptop1024: Story = {
  args: { theme: "dark" },
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    docs: {
      description: {
        story: `Compare at 1024px to ${REFERENCE_DARK}.`,
      },
    },
  },
};

export const LightLaptop1024: Story = {
  args: { theme: "light" },
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    docs: {
      description: {
        story: `Compare at 1024px to ${REFERENCE_LIGHT}.`,
      },
    },
  },
};

export const DarkLaptop1280: Story = {
  args: { theme: "dark" },
  parameters: { viewport: { defaultViewport: "desktop1280" } },
};

export const LightLaptop1280: Story = {
  args: { theme: "light" },
  parameters: { viewport: { defaultViewport: "desktop1280" } },
};

export const DarkDesktop1440: Story = {
  args: { theme: "dark" },
  parameters: { viewport: { defaultViewport: "desktop1440" } },
};

export const LightDesktop1440: Story = {
  args: { theme: "light" },
  parameters: { viewport: { defaultViewport: "desktop1440" } },
};

/** Static PNG reference — avoids duplicate h1/landmarks from side-by-side live panels. */
export const ReferenceComparisonDark: Story = {
  args: { theme: "dark" },
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    layout: "fullscreen",
    docs: {
      description: {
        story: `Live fixture vs static comp PNG (${REFERENCE_DARK}).`,
      },
    },
  },
  render: () => (
    <div className="grid min-h-svh grid-cols-1 bg-[color:var(--portal-bg)] lg:grid-cols-2">
      <div className="relative min-h-svh min-w-0">
        <PortalLaptopHeroPreview theme="dark" />
      </div>
      <div className="flex min-h-svh min-w-0 flex-col border-l border-[color:var(--portal-border)]">
        <p className="shrink-0 px-4 py-2 font-[family-name:var(--font-ui)] text-xs tracking-wide text-[color:var(--portal-muted)] uppercase">
          Reference comp
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-full object-contain object-top"
          height={900}
          src={REFERENCE_DARK}
          width={1024}
        />
      </div>
    </div>
  ),
};

export const ReferenceComparisonLight: Story = {
  args: { theme: "light" },
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    layout: "fullscreen",
    docs: {
      description: {
        story: `Live fixture vs static comp PNG (${REFERENCE_LIGHT}).`,
      },
    },
  },
  render: () => (
    <div className="grid min-h-svh grid-cols-1 bg-[color:var(--portal-bg)] lg:grid-cols-2">
      <div className="relative min-h-svh min-w-0">
        <PortalLaptopHeroPreview theme="light" />
      </div>
      <div className="flex min-h-svh min-w-0 flex-col border-l border-[color:var(--portal-border)]">
        <p className="shrink-0 px-4 py-2 font-[family-name:var(--font-ui)] text-xs tracking-wide text-[color:var(--portal-muted)] uppercase">
          Reference comp
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-full object-contain object-top"
          height={900}
          src={REFERENCE_LIGHT}
          width={1024}
        />
      </div>
    </div>
  ),
};
