import type { Preview } from "@storybook/react";
import "../app/globals.css";
import "../components/portal-atmosphere/styles/portal-atmosphere.storybook-experiments.css";
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
        mobile1: {
          name: "Mobile 320–390",
          styles: { width: "390px", height: "844px" },
        },
        mobile2: {
          name: "Mobile 320 smoke",
          styles: { width: "320px", height: "568px" },
        },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        laptop1024: {
          name: "Laptop 1024",
          styles: { width: "1024px", height: "768px" },
        },
        desktop1280: {
          name: "Desktop 1280",
          styles: { width: "1280px", height: "900px" },
        },
        desktop1440: {
          name: "Desktop 1440",
          styles: { width: "1440px", height: "900px" },
        },
        wide1920: {
          name: "Wide 1920",
          styles: { width: "1920px", height: "1080px" },
        },
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
