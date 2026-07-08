import type { Meta, StoryObj } from "@storybook/react";
import {
  PortalAtmospherePreview,
  PortalAtmosphereSplitPreview,
} from "@/components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture";

const meta = {
  title: "Portal Atmosphere/PA-P6 Access Slot Layout",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "PA-P6 right-side access chamber — composes via PortalAtmospherePreview (fixture authority).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  render: () => <PortalAtmospherePreview theme="dark" />,
};

export const Light: Story = {
  render: () => <PortalAtmospherePreview theme="light" />,
};

export const SplitComparison: Story = {
  render: () => <PortalAtmosphereSplitPreview />,
};
