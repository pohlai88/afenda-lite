import type { Meta, StoryObj } from "@storybook/react";
import type { GuardianMode } from "@/components/auth";
import {
  GuardianAuthFacadePreview,
  GuardianAuthNeonSlotPreview,
} from "@/components/auth/fixtures/guardian-auth-facade.fixture";

/**
 * Viewport containment authority — verify the cinematic auth screen fits one canvas at 100% zoom.
 *
 * Acceptance (desktop ≥981px):
 * - No horizontal scrollbar
 * - No vertical scrollbar on the facade root or access panel
 * - Card, brand, corner panel, headline, and owl all visible
 *
 * Mobile may scroll vertically.
 */
const VIEWPORT_1440 = { viewport: { defaultViewport: "desktop1440" as const } };
const VIEWPORT_1366 = { viewport: { defaultViewport: "laptop1366" as const } };
const VIEWPORT_1280 = { viewport: { defaultViewport: "laptop1280" as const } };
const VIEWPORT_1024 = { viewport: { defaultViewport: "laptop1024" as const } };
const VIEWPORT_MOBILE = { viewport: { defaultViewport: "mobile1" as const } };

const CONTAINMENT_DOCS = {
  description: {
    story: [
      "Viewport lock test at 100% Storybook zoom.",
      "Desktop: `.guardian-auth` is `height: 100dvh; overflow: hidden`.",
      "`.guardian-auth__access-panel` is `overflow: visible` — no inner chamber scrollbar.",
      "Compare to reference screenshots — composition should not require 50% browser zoom.",
    ].join(" "),
  },
};

const meta = {
  title: "Portal Atmosphere/Guardian Auth Viewport Containment",
  component: GuardianAuthFacadePreview,
  args: {
    mode: "night" satisfies GuardianMode,
    state: "idle",
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Dedicated viewport containment harness for Guardian Auth.",
          "Uses `AccessVaultCard` (reference baseline) and mock Neon prod wiring.",
          "Test at 100% zoom — not 50% browser zoom.",
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GuardianAuthFacadePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

/* ---------- Reference vault (AccessVaultCard) — matches reference kit screenshots ---------- */

export const VaultNight1440: Story = {
  name: "vault — night @1440×900",
  parameters: { ...VIEWPORT_1440, docs: CONTAINMENT_DOCS },
};

export const VaultNight1366: Story = {
  name: "vault — night @1366×768",
  parameters: { ...VIEWPORT_1366, docs: CONTAINMENT_DOCS },
};

export const VaultNight1280: Story = {
  name: "vault — night @1280×720",
  parameters: { ...VIEWPORT_1280, docs: CONTAINMENT_DOCS },
};

export const VaultNight1024: Story = {
  name: "vault — night @1024×768",
  parameters: { ...VIEWPORT_1024, docs: CONTAINMENT_DOCS },
};

export const VaultDay1440: Story = {
  name: "vault — day @1440×900",
  args: { mode: "day" },
  parameters: {
    ...VIEWPORT_1440,
    globals: { theme: "light" },
    docs: CONTAINMENT_DOCS,
  },
};

export const VaultDay1366: Story = {
  name: "vault — day @1366×768",
  args: { mode: "day" },
  parameters: {
    ...VIEWPORT_1366,
    globals: { theme: "light" },
    docs: CONTAINMENT_DOCS,
  },
};

export const VaultDay1280: Story = {
  name: "vault — day @1280×720",
  args: { mode: "day" },
  parameters: {
    ...VIEWPORT_1280,
    globals: { theme: "light" },
    docs: CONTAINMENT_DOCS,
  },
};

export const VaultMobile390: Story = {
  name: "vault — night @390×844 (may scroll)",
  parameters: {
    ...VIEWPORT_MOBILE,
    docs: {
      description: {
        story: "Mobile may scroll vertically — stacked layout with `overflow-y: auto`.",
      },
    },
  },
};

/* ---------- Production wiring (Guardian + mock Neon slot) ---------- */

export const NeonProdNight1024: Story = {
  name: "prod neon — night @1024×768",
  parameters: { ...VIEWPORT_1024, docs: CONTAINMENT_DOCS },
  render: () => <GuardianAuthNeonSlotPreview />,
};

export const NeonProdNight1366: Story = {
  name: "prod neon — night @1366×768",
  parameters: { ...VIEWPORT_1366, docs: CONTAINMENT_DOCS },
  render: () => <GuardianAuthNeonSlotPreview />,
};

export const NeonProdNight1280: Story = {
  name: "prod neon — night @1280×720",
  parameters: { ...VIEWPORT_1280, docs: CONTAINMENT_DOCS },
  render: () => <GuardianAuthNeonSlotPreview />,
};

export const NeonProdDay1024: Story = {
  name: "prod neon — day @1024×768",
  parameters: {
    ...VIEWPORT_1024,
    globals: { theme: "light" },
    docs: CONTAINMENT_DOCS,
  },
  render: () => <GuardianAuthNeonSlotPreview />,
};

export const NeonProdDay1366: Story = {
  name: "prod neon — day @1366×768",
  parameters: {
    ...VIEWPORT_1366,
    globals: { theme: "light" },
    docs: CONTAINMENT_DOCS,
  },
  render: () => <GuardianAuthNeonSlotPreview />,
};
