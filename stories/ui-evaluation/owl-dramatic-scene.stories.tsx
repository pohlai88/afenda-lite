import type { Meta, StoryObj } from "@storybook/react";
import { PortalAuthPhantomOwl } from "@/components/portal-auth-brand-scene";
import { Badge } from "@/components/ui/badge";
import {
  BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT,
  BRAND_DRAMATIC_OWL_BACKGROUND_PATH,
  BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH,
  BRAND_DRAMATIC_OWL_MOCKUP_PATH,
} from "@/lib/portal-brand";
import { portalCopy } from "@/lib/portal-copy";
import { IamCheckAuthShellPreview } from "./auth-shell-preview";

/** Storybook defaults — dramatic background reads on near-black vault floor. */
const dramaticParams = {
  layout: "fullscreen" as const,
  globals: { theme: "dark" },
  viewport: { defaultViewport: "desktop" },
};

/**
 * Full vault stack: atmosphere, grid, phantom owl + keylight, scrim, hero copy.
 * Icons use iam light/dark via BrandLogo / BrandMark — dramatic art is background only.
 */
function OwlDramaticVaultScene() {
  const { signIn, product, trust } = portalCopy;

  return (
    <main className="portal-auth-vault">
      <div aria-hidden className="portal-auth-atmosphere" />
      <div aria-hidden className="portal-auth-gridlines" />
      <PortalAuthPhantomOwl />

      <div className="portal-auth-stage">
        <div className="portal-auth-grid">
          <section
            aria-labelledby="dramatic-brand-heading"
            className="portal-auth-brand max-lg:order-2"
          >
            <div aria-hidden className="portal-auth-brand-spacer" />

            <Badge variant="outline" className="portal-auth-eyebrow">
              {product.portalEyebrow}
            </Badge>

            <h1 id="dramatic-brand-heading">{signIn.heroTitle}</h1>

            <p className="portal-auth-hero-description">{signIn.heroDescription}</p>

            <ul className="portal-auth-vault-signals">
              {trust.vaultSignals.map((signal) => (
                <li key={signal} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="portal-auth-vault-signal-dot" />
                  {signal}
                </li>
              ))}
            </ul>
          </section>

          <div
            aria-hidden
            className="portal-auth-chamber-wrap max-lg:order-1 flex min-h-[28rem] items-center justify-center rounded-[calc(var(--radius-2xl)+2px)] border border-dashed border-vault-rim/40 bg-vault-surface/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm"
          >
            Sign-in chamber preview omitted — focus on cinematic owl background
          </div>
        </div>
      </div>
    </main>
  );
}

const meta: Meta = {
  title: "UI Evaluation/Owl Dramatic Scene",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Dramatic painterly owl (${BRAND_DRAMATIC_OWL_BACKGROUND_PATH}) is background-only. Toolbar and chamber icons use iam light/dark via BrandLogo / BrandMark. Compare against the design mockup (${BRAND_DRAMATIC_OWL_MOCKUP_PATH}).`,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const DramaticAuthVault: Story = {
  name: "dramatic owl — full auth vault",
  parameters: dramaticParams,
  render: () => <IamCheckAuthShellPreview />,
};

export const DramaticOwlScene: Story = {
  name: "dramatic owl — hero + guardian",
  parameters: dramaticParams,
  render: () => <OwlDramaticVaultScene />,
};

export const MockupReference: Story = {
  name: "reference — design mockup",
  parameters: dramaticParams,
  render: () => (
    <div className="flex min-h-dvh items-center justify-center bg-black p-4">
      <img
        src={BRAND_DRAMATIC_OWL_MOCKUP_PATH}
        alt="Owl dramatic design mockup reference"
        className="max-h-dvh w-full max-w-6xl object-contain"
        width={1536}
        height={1024}
        decoding="async"
      />
    </div>
  ),
};

export const PhantomLayersOnly: Story = {
  name: "dramatic owl — phantom layers only",
  parameters: dramaticParams,
  render: () => (
    <div className="relative min-h-dvh overflow-hidden bg-vault-floor">
      <div aria-hidden className="portal-auth-atmosphere" />
      <div aria-hidden className="portal-auth-gridlines" />
      <PortalAuthPhantomOwl />
    </div>
  ),
};

export const LegacyIsolatedImg: Story = {
  name: "legacy — isolated img only",
  parameters: dramaticParams,
  render: () => (
    <div className="relative flex min-h-dvh items-end overflow-hidden bg-vault-floor p-8">
      <div aria-hidden className="portal-auth-phantom-glow" />
      <div aria-hidden className="portal-auth-phantom-keylight" />
      <div aria-hidden className="portal-auth-phantom-owl">
        <img
          src={BRAND_DRAMATIC_OWL_BACKGROUND_PATH}
          alt=""
          width={BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH}
          height={BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT}
          decoding="async"
          aria-hidden
          className="portal-auth-phantom-owl-img"
        />
      </div>
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
