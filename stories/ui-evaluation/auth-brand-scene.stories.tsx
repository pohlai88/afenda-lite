import type { Meta, StoryObj } from "@storybook/react";
import { PortalAuthPhantomOwl } from "@/components/portal/portal-auth-brand-scene";
import { IamCheckAuthShellPreview } from "./auth-shell-preview";

const meta: Meta = {
  title: "UI Evaluation/Auth Brand Scene",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Cinematic guardian-owl background scene (PortalAuthPhantomOwl) mounted inside PortalAuthLayout — full-bleed painterly owl art behind the vault sign-in card. Toggle the Storybook theme toolbar control to review light/dark scrim + opacity tuning.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const CinematicOwlScene: Story = {
  name: "full vault shell",
  render: () => <IamCheckAuthShellPreview />,
};

export const OwlSceneOnly: Story = {
  name: "owl scene only (isolated)",
  render: () => (
    <div className="relative flex min-h-dvh items-end overflow-hidden bg-vault-floor p-8">
      <PortalAuthPhantomOwl />
      <div className="relative z-10 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Client portal
        </p>
        <p className="text-3xl font-semibold leading-tight text-foreground">
          Your identity.
          <br />
          Your declaration.
        </p>
      </div>
    </div>
  ),
};
