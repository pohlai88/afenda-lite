import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "UI Evaluation/Client Profile",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Legacy client profile components removed — rebuild with Studio/AdminCN later. */
export const RemovedPendingStudioRebuild: Story = {
  render: () => (
    <div className="p-6 text-sm text-muted-foreground">
      Client profile UI was removed with legacy `components/client`. Rebuild via
      Studio blocks / AdminCN views.
    </div>
  ),
};
