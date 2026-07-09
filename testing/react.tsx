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
