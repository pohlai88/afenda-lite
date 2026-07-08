import type { Meta, StoryObj } from "@storybook/react";
import {
  PortalAtmospherePreview,
  PortalAtmosphereSplitPreview,
} from "@/components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture";

const meta = {
  title: "Portal Atmosphere/PA-P4 Editorial Hero",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "PA-P4 poster typography via PortalAtmospherePreview (fixture authority). Dark inverts PROTECTED; light inverts TRUTH.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  render: () => (
    <PortalAtmospherePreview
      theme="dark"
      showSeal={false}
      showAccessSlot={false}
    />
  ),
};

export const Light: Story = {
  render: () => (
    <PortalAtmospherePreview
      theme="light"
      showSeal={false}
      showAccessSlot={false}
    />
  ),
};

export const SplitComparison: Story = {
  render: () => (
    <PortalAtmosphereSplitPreview showSeal={false} showAccessSlot={false} />
  ),
};

export const HeroOnly: Story = {
  render: () => (
    <PortalAtmospherePreview
      theme="dark"
      showSeal={false}
      showAccessSlot={false}
    />
  ),
};
