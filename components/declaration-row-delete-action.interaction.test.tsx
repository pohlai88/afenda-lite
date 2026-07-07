import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DeclarationRowDeleteAction } from "@/components/declaration-row-delete-action";
import { portalCopy } from "@/lib/portal-copy";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("@/app/actions/surveys", () => ({
  deleteSurveyAction: vi.fn(),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">Open actions</button>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("DeclarationRowDeleteAction", () => {
  it("opens confirm dialog when delete menu item is selected", async () => {
    const user = setupUser();
    const { manage } = portalCopy.declarationDetail;

    renderPortal(
      <DeclarationRowDeleteAction surveyId="7b0338e4-a089-4d32-9c38-03996aec017f" />,
    );

    await user.click(screen.getByRole("menuitem", { name: manage.deleteSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: manage.deleteTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(manage.deleteConfirm)).toBeInTheDocument();
  });
});
