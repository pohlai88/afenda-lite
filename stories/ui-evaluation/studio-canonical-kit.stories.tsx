import type { Meta, StoryObj } from "@storybook/react";
import LoginPage02 from "@/components/shadcn-studio/blocks/login-page-02/login-page-02";
import EmptyState01 from "@/components/shadcn-studio/blocks/empty-state-01/empty-state-01";
import AccountSettings01 from "@/components/shadcn-studio/blocks/account-settings-01/account-settings-01";
import { PortalEmptyStateCard } from "@/components/portal/portal-empty-state";
import { PortalFormSection } from "@/components/portal/portal-form-section";
import {
  CANONICAL_STUDIO_KIT,
  getCanonicalStudioEntry,
} from "@/lib/governance/studio-canonical-kit";
import { InboxIcon } from "lucide-react";

const meta: Meta = {
  title: "UI Evaluation/Studio Canonical Kit",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Single Shadcn Studio (base-nova) design language. Login-page-02 is layout reference only — Neon AuthView owns production credentials.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function KitIndex() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Canonical Studio kit</h1>
      <p className="text-sm text-muted-foreground">
        Authority: <code>lib/studio-canonical-kit.ts</code>. Install via{" "}
        <code>npm run studio:install-block -- &lt;slug&gt;</code>.
      </p>
      <ul className="space-y-3">
        {CANONICAL_STUDIO_KIT.map((entry) => (
          <li
            key={entry.blockSlug}
            className="rounded-lg border bg-card p-4 text-sm"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{entry.blockSlug}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {entry.role}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{entry.notes}</p>
            <p className="mt-2 text-xs">
              Adoption: {entry.portalAdoption}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const KitIndexStory: Story = {
  name: "Kit index",
  render: () => <KitIndex />,
};

export const LoginPage02LayoutReference: Story = {
  name: "login-page-02 (layout reference — not prod auth)",
  render: () => (
    <div className="min-h-dvh">
      <p className="border-b bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-50">
        Layout reference only. Production sign-in uses Guardian + Neon AuthView (
        {getCanonicalStudioEntry("login-page-02")?.portalAdoption}).
      </p>
      <LoginPage02 />
    </div>
  ),
};

export const EmptyState01VsPortalWrapper: Story = {
  name: "empty-state-01 vs PortalEmptyStateCard",
  render: () => (
    <div className="grid gap-8 p-8 lg:grid-cols-2">
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Studio empty-state-01</h2>
        <EmptyState01 />
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Portal wrapper (prefer in app)</h2>
        <PortalEmptyStateCard
          icon={InboxIcon}
          title="No declarations yet"
          description="When a declaration is issued, it will appear here."
        />
      </div>
    </div>
  ),
};

export const FormLayout01PortalPattern: Story = {
  name: "form-layout-01 → PortalFormSection",
  render: () => (
    <div className="mx-auto max-w-2xl p-8">
      <PortalFormSection
        title="Canonical form section"
        description="form-layout-01 is the default single-section pattern."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-md border bg-muted/20" />
          <div className="h-10 rounded-md border bg-muted/20" />
        </div>
      </PortalFormSection>
    </div>
  ),
};

export const AccountSettings01ChromeReference: Story = {
  name: "account-settings-01 (chrome reference — Neon owns account)",
  render: () => (
    <div className="min-h-dvh">
      <p className="border-b bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-50">
        Chrome reference. Production account routes keep Neon AccountView; adopt
        section density only.
      </p>
      <AccountSettings01 />
    </div>
  ),
};
