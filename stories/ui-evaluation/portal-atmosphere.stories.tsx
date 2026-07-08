import type { Meta, StoryObj } from "@storybook/react";
import {
  PortalAtmosphere,
  PortalBackgroundLayers,
} from "@/components/portal-atmosphere";
import { AuthSlotSampleCard } from "@/components/portal-atmosphere/fixtures/auth-slot-sample-card";
import { PortalAuthSlotSample } from "@/components/portal-atmosphere/fixtures/auth-slot-sample";
import {
  PortalAtmospherePreview,
  PortalAtmosphereSplitPreview,
} from "@/components/portal-atmosphere/fixtures/portal-atmosphere-preview.fixture";

const SCREENSHOT_BASELINE_README =
  "docs/ui-evaluation/portal-atmosphere/README.md";

const meta = {
  title: "Portal Atmosphere/Design Review",
  component: PortalAtmospherePreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "PA-P7 design approval + PA-P8 responsive review.",
          "Renders production `PortalAtmosphere` via `PortalAtmospherePreview` only.",
          "Only the access slot uses inert placeholder content — never mount AuthView or Neon providers.",
          `Screenshot baselines: ${SCREENSHOT_BASELINE_README}`,
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
    showSeal: { control: "boolean" },
    showOwl: { control: "boolean" },
    showAccessSlot: { control: "boolean" },
    owlPreset: {
      control: "inline-radio",
      options: ["sharp", "dramatic"],
    },
    editorialVariant: {
      control: "inline-radio",
      options: ["sharp", "classic"],
    },
  },
} satisfies Meta<typeof PortalAtmospherePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DarkDesktop: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    viewport: { defaultViewport: "desktop1440" },
    docs: {
      description: {
        story:
          "Night atmosphere at 1440px. Capture baseline per docs/ui-evaluation/portal-atmosphere/README.md",
      },
    },
  },
};

export const LightDesktop: Story = {
  args: {
    theme: "light",
  },
  parameters: {
    viewport: { defaultViewport: "desktop1440" },
    docs: {
      description: {
        story:
          "Day atmosphere at 1440px. Capture baseline per docs/ui-evaluation/portal-atmosphere/README.md",
      },
    },
  },
};

export const SplitTheme: Story = {
  parameters: {
    viewport: { defaultViewport: "desktop1440" },
    docs: {
      description: {
        story:
          "Dark inverts PROTECTED; light inverts TRUTH. Side-by-side inversion sign-off.",
      },
    },
  },
  render: () => <PortalAtmosphereSplitPreview />,
};

export const PlaceholderAccessSlot: Story = {
  args: {
    theme: "dark",
    showSeal: false,
    showOwl: false,
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    docs: {
      description: {
        story:
          "Mobile access-first layout with placeholder chamber only — no owl or seal for slot isolation.",
      },
    },
  },
};

export const Laptop1024Dark: Story = {
  args: { theme: "dark" },
  parameters: {
    viewport: { defaultViewport: "laptop1024" },
    docs: {
      description: {
        story: "PA-P8 laptop breakpoint — desktop grid activates at 1024px.",
      },
    },
  },
};

export const Desktop1280Dark: Story = {
  args: { theme: "dark" },
  parameters: {
    viewport: { defaultViewport: "desktop1280" },
  },
};

export const Wide1920Dark: Story = {
  args: { theme: "dark" },
  parameters: {
    viewport: { defaultViewport: "wide1920" },
  },
};

export const TabletDark: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
    docs: {
      description: {
        story: "PA-P8 tablet review at 768px — access-first mobile order below 1024px.",
      },
    },
  },
};

export const TabletLight: Story = {
  args: {
    theme: "light",
  },
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
    docs: {
      description: {
        story: "PA-P8 tablet review at 768px — light theme.",
      },
    },
  },
};

export const MobileDark: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story:
          "PA-P8 mobile review at 390px — access slot before editorial brand.",
      },
    },
  },
};

export const MobileLight: Story = {
  args: {
    theme: "light",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "PA-P8 mobile review at 390px — light theme.",
      },
    },
  },
};

export const SmallMobileSmoke: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile2",
    },
    docs: {
      description: {
        story:
          "PA-P8 320px smoke guard — no horizontal overflow; access slot remains usable.",
      },
    },
  },
};

export const ResponsiveMatrix: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Desktop, tablet, and mobile frames for quick responsive comparison (formal hardening: PA-P8).",
      },
    },
  },
  render: () => (
    <div className="grid min-h-svh gap-6 bg-[color:var(--portal-bg)] p-4 font-[family-name:var(--font-ui)] text-[color:var(--portal-fg)] lg:grid-cols-3">
      {[
        { label: "Desktop 1440", width: 1440, displayWidth: 400, theme: "dark" as const },
        { label: "Tablet 768", width: 768, displayWidth: 400, theme: "dark" as const },
        { label: "Mobile 390", width: 390, displayWidth: 390, theme: "light" as const },
      ].map(({ label, width, displayWidth, theme }) => {
        const scale = displayWidth / width;

        return (
          <div key={label} className="min-w-0">
            <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[color:var(--portal-muted)] uppercase">
              {label}
            </p>
            <div
              className="overflow-hidden rounded-xl border border-[color:var(--portal-border)]"
              style={{ width: displayWidth, height: Math.round(720 * scale) }}
            >
              <div
                style={{
                  width,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <PortalAtmospherePreview theme={theme} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ),
};

/** PA-P10 auth slot sample — mock card only, no Neon Auth. */
export const AuthSlotSampleDark: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    viewport: { defaultViewport: "desktop1440" },
    docs: {
      description: {
        story:
          "PA-P10 integration readiness: sample auth chamber in access slot. Real Neon Auth wiring is a follow-up PR.",
      },
    },
  },
  render: () => (
    <PortalAuthSlotSample theme="dark">
      <AuthSlotSampleCard />
    </PortalAuthSlotSample>
  ),
};

/** PA-P2 slice review — background layers only. */
export const BackgroundLayersOnly: Story = {
  args: {
    theme: "dark",
  },
  parameters: {
    title: "Portal Atmosphere/PA-P2 Background Layers",
    docs: {
      description: {
        story:
          "PA-P2 smoke: explicit PortalBackgroundLayers child — canvas, glows, and grid only.",
      },
    },
  },
  render: () => (
    <PortalAtmosphere theme="dark" withBackgroundLayers={false}>
      <PortalBackgroundLayers />
      <div className="portal-atmosphere__content grid min-h-svh place-items-center text-sm text-[color:var(--portal-muted)]">
        PA-P2 dark background only
      </div>
    </PortalAtmosphere>
  ),
};
