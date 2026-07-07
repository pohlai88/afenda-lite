import type { Preview } from "@storybook/react";
import "../app/globals.css";
import { withPortalTheme } from "./decorators";

// Guard for any dependency that reads `process` in the browser bundle.
if (typeof globalThis.process === "undefined") {
  globalThis.process = {
    env: { NODE_ENV: "development" },
  } as unknown as NodeJS.Process;
}

const preview: Preview = {
  decorators: [withPortalTheme],
  parameters: {
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "portal",
      values: [
        { name: "portal", value: "oklch(0.984 0.003 248.2)" },
        { name: "dark", value: "oklch(0.145 0.022 265)" },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: "Mobile", styles: { width: "375px", height: "667px" } },
        tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop", styles: { width: "1440px", height: "900px" } },
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Portal color scheme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
