/**
 * @deprecated Prefer UI Evaluation / Brand Icon — kept for bookmark compatibility.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { BrandThemeIcon } from "@/components/portal-brand-mark";
import { BRAND_CONTEXT } from "@/lib/portal-brand";

const meta: Meta = {
  title: "UI Evaluation/Brand Disk",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const BrandChromeDiskOnly: Story = {
  name: "brand theme icon only",
  render: () => (
    <div className="flex min-h-dvh items-center justify-center bg-sidebar p-8">
      <BrandThemeIcon shellClassName={BRAND_CONTEXT.sidebar.shellClass} />
    </div>
  ),
};
