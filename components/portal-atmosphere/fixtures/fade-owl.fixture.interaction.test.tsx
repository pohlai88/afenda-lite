import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  FADE_OWL_VAULT_COPY,
  FadeOwlBeastmodeDemo,
  FadeOwlPreview,
} from "./fade-owl.fixture";
import {
  FADE_OWL_GUARDIAN_OWL_PATH,
  FADE_OWL_RENDER_LIGHT_PATH,
  FADE_OWL_RENDER_NIGHT_PATH,
} from "@/lib/copy/portal-brand";

describe("fade owl fixture — dual variant", () => {
  it("renders dual guardian layers and mode attribute", () => {
    const { container } = render(<FadeOwlPreview mode="light" variant="dual" />);

    expect(container.querySelector('[data-fade-owl-mode="light"]')).toBeTruthy();
    expect(container.querySelector('[data-fade-owl-variant="dual"]')).toBeTruthy();
    expect(container.querySelector(".portal-fade-owl__owl--light")).toHaveAttribute(
      "src",
      FADE_OWL_RENDER_LIGHT_PATH,
    );
    expect(container.querySelector(".portal-fade-owl__owl--night")).toHaveAttribute(
      "src",
      FADE_OWL_RENDER_NIGHT_PATH,
    );
    expect(container.querySelector(".portal-fade-owl__owl--morpho")).toBeNull();
  });
});

describe("fade owl fixture — morpho variant", () => {
  it("renders single morpho iso without dual layers", () => {
    const { container } = render(
      <FadeOwlPreview mode="night" variant="morpho" />,
    );

    expect(container.querySelector('[data-fade-owl-variant="morpho"]')).toBeTruthy();
    expect(container.querySelector(".portal-fade-owl__owl--morpho")).toHaveAttribute(
      "src",
      FADE_OWL_GUARDIAN_OWL_PATH,
    );
    expect(container.querySelector(".portal-fade-owl__owl--light")).toBeNull();
    expect(container.querySelector(".portal-fade-owl__owl--night")).toBeNull();
  });
});

describe("fade owl fixture — shared chrome", () => {
  it("exposes editorial h1 and Access Vault section", () => {
    render(<FadeOwlPreview mode="night" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Truth,\s*held quietly\./,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: FADE_OWL_VAULT_COPY.title,
      }),
    ).toBeInTheDocument();
  });

  it("excludes mock vault fields from the accessibility tree", () => {
    const { container } = render(<FadeOwlPreview mode="night" />);

    expect(container.querySelector(".portal-fade-owl__vault-mock")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("fade owl beastmode demo", () => {
  it("starts in day mode and toggles to night via top-right control", async () => {
    const user = userEvent.setup();
    const { container } = render(<FadeOwlBeastmodeDemo />);

    expect(container.querySelector('[data-fade-owl-mode="light"]')).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Switch to night beastmode" }),
    );

    expect(container.querySelector('[data-fade-owl-mode="night"]')).toBeTruthy();
  });

  it("supports morpho variant toggle", async () => {
    const user = userEvent.setup();
    const { container } = render(<FadeOwlBeastmodeDemo variant="morpho" />);

    expect(container.querySelector('[data-fade-owl-variant="morpho"]')).toBeTruthy();
    expect(container.querySelector(".portal-fade-owl__owl--morpho")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Switch to night beastmode" }),
    );

    expect(container.querySelector('[data-fade-owl-mode="night"]')).toBeTruthy();
  });
});
