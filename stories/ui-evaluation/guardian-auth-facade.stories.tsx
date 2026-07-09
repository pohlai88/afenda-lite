import type { Meta, StoryObj } from "@storybook/react";
import type { GuardianMode, GuardianState } from "@/components/auth";
import {
  GuardianAuthFacadeInteractive,
  GuardianAuthFacadePreview,
} from "@/components/auth/fixtures/guardian-auth-facade.fixture";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";

const LAPTOP_1024 = { viewport: { defaultViewport: "laptop1024" as const } };
const DESKTOP_1440 = { viewport: { defaultViewport: "desktop1440" as const } };

const GUARDIAN_MODES = ["night", "day"] satisfies GuardianMode[];
const GUARDIAN_STATES = [
  "idle",
  "typing",
  "loading",
  "success",
  "error",
  "locked",
  "warning",
] satisfies GuardianState[];

const meta = {
  title: "Portal Atmosphere/Guardian Auth Facade",
  component: GuardianAuthFacadePreview,
  args: {
    mode: "night" satisfies GuardianMode,
    state: "idle" satisfies GuardianState,
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Reusable cinematic auth system — `GuardianAuthFacade` composes",
          "`OwlScene`, `EditorialPosterCopy`, `AccessVaultCard`,",
          "`GuardianShield`, and `ThemeToggle`. Owl markup lives only in",
          "OwlScene; card markup only in AccessVaultCard. CSS state classes:",
          "`.guardian-auth--day|night` and `.guardian-auth--state-*`.",
          `Assets: ${Object.values(GUARDIAN_AUTH_ASSET_SET).join(", ")}.`,
          "Storybook design review — prod sign-in uses the same kit at",
          "/auth/sign-in until Neon Auth is wired into AccessVaultCard.",
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "inline-radio",
      options: GUARDIAN_MODES,
      description: "Day/night owl cross-fade",
    },
    state: {
      control: "select",
      options: GUARDIAN_STATES,
      description: "Login chamber + shield visual state",
    },
  },
} satisfies Meta<typeof GuardianAuthFacadePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NightIdle: Story = {
  name: "static — night idle",
  parameters: LAPTOP_1024,
};

export const DayIdle: Story = {
  name: "static — day idle",
  args: { mode: "day" },
  parameters: LAPTOP_1024,
};

export const NightLoading: Story = {
  name: "static — night loading",
  args: { state: "loading" },
  parameters: LAPTOP_1024,
};

export const NightError: Story = {
  name: "static — night error",
  args: { state: "error" },
  parameters: LAPTOP_1024,
};

export const DaySuccess: Story = {
  name: "static — day success",
  args: { mode: "day", state: "success" },
  parameters: LAPTOP_1024,
};

export const DayLocked: Story = {
  name: "static — day locked",
  args: { mode: "day", state: "locked" },
  parameters: LAPTOP_1024,
};

export const Desktop1440: Story = {
  name: "static — night idle @1440",
  parameters: DESKTOP_1440,
};

export const Interactive: Story = {
  name: "interactive — mode toggle + state toolbar",
  parameters: {
    ...LAPTOP_1024,
    docs: {
      description: {
        story:
          "Click ☾/☼ top-right for day/night cross-fade. Use the bottom-left toolbar to preview GuardianState variants.",
      },
    },
  },
  render: () => <GuardianAuthFacadeInteractive />,
};
