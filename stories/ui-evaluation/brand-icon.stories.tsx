import type { Meta, StoryObj } from "@storybook/react";
import {
  BrandIconAssetLadder,
  BrandIconCatalog,
  BrandIconContextMatrix,
  BrandIconLiveThemeDemo,
  BrandIconShellProof,
  BrandIconSurfacePlacements,
  BrandIconThemeCompare,
} from "./brand-icon-preview";
import { PortalAuthPhantomOwl } from "@/components/portal/portal-auth-brand-scene";

const meta: Meta = {
  title: "UI Evaluation/Brand Icon",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Dual-theme iAM brand icons — light/dark removebg masters, legacy CSS swap in web UI, favicon sync on toggle.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Catalog: Story = {
  name: "catalog (all contexts)",
  render: () => <BrandIconCatalog />,
};

export const ThemeCompare: Story = {
  name: "light vs dark masters",
  render: () => (
    <div className="bg-background p-6 sm:p-8">
      <BrandIconThemeCompare />
    </div>
  ),
};

export const ContextMatrix: Story = {
  name: "context matrix",
  render: () => (
    <div className="bg-background p-6 sm:p-8">
      <BrandIconContextMatrix />
    </div>
  ),
};

export const AssetLadder: Story = {
  name: "asset ladder",
  render: () => (
    <div className="bg-background p-6 sm:p-8">
      <BrandIconAssetLadder />
    </div>
  ),
};

export const SurfacePlacements: Story = {
  name: "surface placements",
  render: () => (
    <div className="bg-background p-6 sm:p-8">
      <BrandIconSurfacePlacements />
    </div>
  ),
};

export const AuthHeroScene: Story = {
  name: "auth phantom owl scene",
  render: () => (
    <div className="relative flex min-h-dvh items-end bg-vault-floor p-8 overflow-hidden">
      <PortalAuthPhantomOwl />
      <div className="relative z-10 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client portal</p>
        <p className="text-3xl font-semibold leading-tight text-foreground">Your identity.<br />Your declaration.</p>
      </div>
    </div>
  ),
};

export const ShellProof: Story = {
  name: "shell containment proof",
  render: () => <BrandIconShellProof />,
};

export const LiveThemeSwap: Story = {
  name: "live theme swap",
  render: () => <BrandIconLiveThemeDemo />,
};
