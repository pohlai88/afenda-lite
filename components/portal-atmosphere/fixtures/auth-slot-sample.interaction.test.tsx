import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveSharpEditorialHeading } from "../contracts/portal-editorial.contract";
import { AuthSlotSampleCard } from "./auth-slot-sample-card";
import { PortalAuthSlotSample } from "./auth-slot-sample";

describe("PortalAuthSlotSample", () => {
  it("renders auth content inside the access slot sample", () => {
    render(
      <PortalAuthSlotSample theme="dark">
        <AuthSlotSampleCard />
      </PortalAuthSlotSample>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: resolveSharpEditorialHeading("dark"),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Access Vault",
      }),
    ).toBeInTheDocument();
  });

  it("supports route-owned h1 pattern", () => {
    render(
      <>
        <h1>Organization sign in</h1>
        <PortalAuthSlotSample theme="light" suppressPageHeading>
          <AuthSlotSampleCard />
        </PortalAuthSlotSample>
      </>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Organization sign in" }),
    ).toBeInTheDocument();
  });
});
