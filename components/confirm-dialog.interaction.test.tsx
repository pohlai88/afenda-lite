import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { portalCopy } from "@/lib/copy/portal-copy";
import { renderPortal, setupUser } from "@/testing/react";

describe("ConfirmDialog", () => {
  it("shows declaration delete copy when opened from row action", async () => {
    const user = setupUser();
    const { manage } = portalCopy.declarationDetail;
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    function DeleteConfirmHarness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            {manage.deleteSubmit}
          </button>
          <ConfirmDialog
            open={open}
            title={manage.deleteTitle}
            description={manage.deleteConfirm}
            confirmLabel={manage.deleteSubmit}
            cancelLabel={manage.deleteCancel}
            destructive
            onCancel={() => {
              setOpen(false);
              onCancel();
            }}
            onConfirm={() => {
              setOpen(false);
              onConfirm();
            }}
          />
        </>
      );
    }

    renderPortal(<DeleteConfirmHarness />);

    await user.click(screen.getByRole("button", { name: manage.deleteSubmit }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: manage.deleteTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(manage.deleteConfirm)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: manage.deleteSubmit }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
