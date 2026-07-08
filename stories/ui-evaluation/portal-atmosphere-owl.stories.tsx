import type { Meta, StoryObj } from "@storybook/react";
import { PortalAtmosphere, PortalGuardianOwl } from "@/components/portal-atmosphere";
import { PortalGuardianOwlPreview } from "@/components/portal-atmosphere/fixtures/portal-guardian-owl-preview.fixture";

const meta = {
  title: "Portal Atmosphere/PA-P3 Guardian Owl",
  component: PortalGuardianOwlPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "PA-P3 ghost owl at z-2 on PA-P2 background. Explicit layers slot — not auto-wired into PortalAtmosphere.",
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
} satisfies Meta<typeof PortalGuardianOwlPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  args: { theme: "dark" },
};

export const Light: Story = {
  args: { theme: "light" },
};

export const OwlDisabled: Story = {
  args: { theme: "dark" },
  render: () => (
    <PortalAtmosphere theme="dark" layers={<PortalGuardianOwl showOwl={false} />}>
      <div className="grid min-h-svh place-items-center font-[family-name:var(--font-ui)] text-[color:var(--portal-fg)]">
        <p className="text-sm text-[color:var(--portal-muted)]">Owl layer disabled</p>
      </div>
    </PortalAtmosphere>
  ),
};
