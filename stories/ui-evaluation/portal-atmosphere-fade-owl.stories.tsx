import type { Meta, StoryObj } from "@storybook/react";
import {
  FadeOwlBeastmodeDemo,
  FadeOwlPreview,
} from "@/components/portal-atmosphere/fixtures/fade-owl.fixture";

const meta = {
  title: "Portal Atmosphere/Fade Owl",
  component: FadeOwlPreview,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Storybook-only cinematic sign-in experiment. Two owl variants:",
          "`dual` — light-guardian ↔ night-guardian opacity cross-fade;",
          "`morpho` — single guardian-dramatic-iso with CSS mode presentation.",
          "No invert, no prod wiring.",
        ].join(" "),
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["dual", "morpho"],
    },
    mode: {
      control: "inline-radio",
      options: ["light", "night"],
    },
  },
} satisfies Meta<typeof FadeOwlPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

const laptop = { viewport: { defaultViewport: "laptop1024" as const } };

/* --- dual PNG cross-fade --- */

export const DualLight: Story = {
  name: "dual — light",
  args: { mode: "light", variant: "dual" },
  parameters: laptop,
};

export const DualNight: Story = {
  name: "dual — night",
  args: { mode: "night", variant: "dual" },
  parameters: laptop,
};

export const DualBeastmodeToggle: Story = {
  name: "dual — beastmode toggle",
  render: () => <FadeOwlBeastmodeDemo variant="dual" />,
  parameters: laptop,
};

/* --- morpho single iso --- */

export const MorphoLight: Story = {
  name: "morpho — light",
  args: { mode: "light", variant: "morpho" },
  parameters: laptop,
};

export const MorphoNight: Story = {
  name: "morpho — night",
  args: { mode: "night", variant: "morpho" },
  parameters: laptop,
};

export const MorphoBeastmodeToggle: Story = {
  name: "morpho — beastmode toggle",
  render: () => <FadeOwlBeastmodeDemo variant="morpho" />,
  parameters: laptop,
};

export const OwlLayersOnly: Story = {
  name: "dual — owl layers only",
  args: { mode: "night", variant: "dual", layersOnly: true },
  parameters: laptop,
};
