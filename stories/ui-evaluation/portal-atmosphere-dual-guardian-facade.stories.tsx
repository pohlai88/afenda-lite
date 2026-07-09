import type { Meta, StoryObj } from "@storybook/react";
import { PortalDualGuardianFacade } from "@/components/portal-atmosphere/fixtures/portal-dual-guardian-facade.fixture";

const meta = {
  title: "Portal Atmosphere/Dual Guardian Facade",
  component: PortalDualGuardianFacade,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Original cinematic concept (design review, not yet approved) — one",
          "full-screen poster. Dark owl emerges from the left shadow, white owl",
          "emerges from the right light, both ghosted into the background.",
          "Access Vault sits center-right, integrated into a glowing",
          "shield/keyhole threshold, framed by celestial gold rings and a",
          "subtle marble wash over deep navy shadow and pale ivory light.",
          "Theme-invariant by design — both owls and tones are present",
          "together as one duality artwork. Storybook only; no prod wiring.",
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PortalDualGuardianFacade>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Laptop1024: Story = {
  parameters: { viewport: { defaultViewport: "laptop1024" } },
};

export const Desktop1440: Story = {
  parameters: { viewport: { defaultViewport: "desktop1440" } },
};
