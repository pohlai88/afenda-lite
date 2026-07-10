import type { Meta, StoryObj } from "@storybook/react";

import { LynxLandingPage } from "@/features/landing";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";

const meta = {
  title: "UI Evaluation/Lynx Landing",
  component: LynxLandingPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Guest `/` landing — full-bleed deco-comp background (public/lynx/lynx-deco.png), left editorial copy, right glass card. Sign in → /auth/sign-in.",
      },
    },
  },
  args: {
    signInHref: AUTH_SIGN_IN_HREF,
  },
} satisfies Meta<typeof LynxLandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "guest landing (theme toolbar)",
};

export const DarkAtmosphere: Story = {
  name: "dark atmosphere",
  decorators: [
    (Story) => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
      return (
        <div className="min-h-dvh">
          <Story />
        </div>
      );
    },
  ],
};

export const LightAtmosphere: Story = {
  name: "light atmosphere",
  decorators: [
    (Story) => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      return (
        <div className="min-h-dvh">
          <Story />
        </div>
      );
    },
  ],
};
