import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";

export function setupUser() {
  return userEvent.setup();
}

export function PortalTestProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultTheme="light">{children}</ThemeProvider>;
}

export function renderPortal(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: PortalTestProviders,
    ...options,
  });
}

export async function openMenu(user: ReturnType<typeof setupUser>, name: RegExp | string) {
  await user.click(
    typeof name === "string"
      ? document.querySelector(`[aria-label="${name}"]`) ??
          (() => {
            throw new Error(`Menu trigger not found: ${name}`);
          })()
      : (() => {
          throw new Error("Use getByRole in tests for menu triggers");
        })(),
  );
}

export async function openDialog(user: ReturnType<typeof setupUser>, label: RegExp | string) {
  const trigger =
    typeof label === "string"
      ? document.body.querySelector(`button`)
      : null;
  if (!trigger) {
    throw new Error("openDialog requires explicit getByRole in component tests");
  }
  await user.click(trigger);
}
