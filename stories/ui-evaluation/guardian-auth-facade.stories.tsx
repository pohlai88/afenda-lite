import type { Meta, StoryObj } from "@storybook/react";
import type { GuardianMode, GuardianState } from "@/components/auth";
import {
  GuardianAuthFacadeInteractive,
  GuardianAuthFacadePreview,
  GuardianAuthNeonSlotPreview,
} from "@/components/auth/fixtures/guardian-auth-facade.fixture";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/copy/portal-brand";

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
          "`OwlScene`, `EditorialPosterCopy`, `GuardianShield`, and `ThemeToggle`.",
          "Production `/auth/*` mounts `PortalAuthNeonView` in the access slot (ADR-Auth-UI-001).",
          "`AccessVaultCard` is Storybook mock only.",
          `Assets: ${Object.values(GUARDIAN_AUTH_ASSET_SET).join(", ")}.`,
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

export const NightSuccess: Story = {
  name: "static — night success (green)",
  args: { state: "success" },
  parameters: LAPTOP_1024,
};

export const NightWarning: Story = {
  name: "static — night warning (amber)",
  args: { state: "warning" },
  parameters: LAPTOP_1024,
};

export const NightTyping: Story = {
  name: "static — night typing (gold)",
  args: { state: "typing" },
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

export const NeonSlotProdWiring: Story = {
  name: "prod wiring — Guardian + mock Neon slot",
  parameters: {
    ...LAPTOP_1024,
    docs: {
      description: {
        story:
          "Mirrors production: GuardianAuthFacade + PortalAuthFormIntro + Neon AuthView in the access slot. Live AuthView requires NeonAuthUIProvider (app route only).",
      },
    },
  },
  render: () => <GuardianAuthNeonSlotPreview />,
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

const REFERENCE_DARK = "/brand/heroes/auth-hero-dark.png";
const REFERENCE_LIGHT = "/brand/heroes/auth-hero-light.png";

/** Production Guardian shell vs comp PNG — human sign-off at 1024px (pa-hero-quality-benchmark). */
export const ReferenceComparisonNight: Story = {
  name: "benchmark — night vs auth-hero-dark @1024",
  parameters: {
    ...LAPTOP_1024,
    layout: "fullscreen",
    docs: {
      description: {
        story: `Live Guardian prod wiring vs ${REFERENCE_DARK}. Functional parity done; pixel match is human sign-off.`,
      },
    },
  },
  render: () => (
    <div className="grid min-h-svh grid-cols-1 bg-black lg:grid-cols-2">
      <div className="relative min-h-svh min-w-0">
        <GuardianAuthNeonSlotPreview />
      </div>
      <div className="flex min-h-svh min-w-0 flex-col border-l border-white/10">
        <p className="shrink-0 px-4 py-2 font-[family-name:var(--font-ui)] text-xs tracking-wide text-white/60 uppercase">
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

export const ReferenceComparisonDay: Story = {
  name: "benchmark — day vs auth-hero-light @1024",
  parameters: {
    ...LAPTOP_1024,
    layout: "fullscreen",
    globals: { theme: "light" },
    docs: {
      description: {
        story: `Live Guardian prod wiring vs ${REFERENCE_LIGHT}. Toggle Storybook theme to day before compare.`,
      },
    },
  },
  render: () => (
    <div className="grid min-h-svh grid-cols-1 bg-[color:var(--portal-bg)] lg:grid-cols-2">
      <div className="relative min-h-svh min-w-0">
        <GuardianAuthFacadePreview mode="day" state="idle" />
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
