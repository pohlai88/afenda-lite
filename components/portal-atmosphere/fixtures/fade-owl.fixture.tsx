"use client";

import { useState } from "react";
import {
  FADE_OWL_GUARDIAN_OWL_PATH,
  FADE_OWL_OWL_HEIGHT,
  FADE_OWL_OWL_WIDTH,
  FADE_OWL_RENDER_LIGHT_PATH,
  FADE_OWL_RENDER_NIGHT_PATH,
  type FadeOwlMode,
} from "@/lib/copy/portal-brand";

export type { FadeOwlMode };

/** Dual PNG cross-fade vs single morpho iso (CSS mode presentation). */
export type FadeOwlVariant = "dual" | "morpho";

export const FADE_OWL_EDITORIAL = {
  headlineLead: "Truth,",
  headlineRest: "held quietly.",
  subline: "Guarded for trusted declarations.",
} as const;

export const FADE_OWL_VAULT_COPY = {
  title: "Access Vault",
  emailLabel: "Email",
  emailPlaceholder: "name@example.com",
  passwordLabel: "Password",
  passwordPlaceholder: "••••••••",
  forgot: "Forgot?",
  submit: "Unlock",
} as const;

export interface FadeOwlPreviewProps {
  /** Beastmode / night mode — maps to Gemini `isNightMode`. */
  readonly mode?: FadeOwlMode;
  /** `dual` = light/night PNGs; `morpho` = single guardian-dramatic-iso. */
  readonly variant?: FadeOwlVariant;
  readonly layersOnly?: boolean;
  readonly showBeastmodeToggle?: boolean;
  readonly onModeChange?: (mode: FadeOwlMode) => void;
}

/**
 * Fade Owl (Storybook only).
 * - `dual`: light-guardian ↔ night-guardian opacity cross-fade
 * - `morpho`: single morpho iso; light/night via CSS atmosphere + blend
 */
export function FadeOwlPreview({
  mode = "light",
  variant = "dual",
  layersOnly = false,
  showBeastmodeToggle = false,
  onModeChange,
}: FadeOwlPreviewProps) {
  const isNight = mode === "night";
  const isMorpho = variant === "morpho";

  return (
    <main
      className="portal-fade-owl"
      data-fade-owl=""
      data-fade-owl-mode={mode}
      data-fade-owl-variant={variant}
    >
      <div aria-hidden="true" className="portal-fade-owl__stack">
        <div
          className="portal-fade-owl__atmosphere portal-fade-owl__atmosphere--light"
          data-fade-owl-atmosphere="light"
        />
        <div
          className="portal-fade-owl__atmosphere portal-fade-owl__atmosphere--night"
          data-fade-owl-atmosphere="night"
        />
        {isMorpho ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="portal-fade-owl__owl portal-fade-owl__owl--morpho"
            decoding="async"
            height={FADE_OWL_OWL_HEIGHT}
            src={FADE_OWL_GUARDIAN_OWL_PATH}
            width={FADE_OWL_OWL_WIDTH}
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="portal-fade-owl__owl portal-fade-owl__owl--light"
              decoding="async"
              height={FADE_OWL_OWL_HEIGHT}
              src={FADE_OWL_RENDER_LIGHT_PATH}
              width={FADE_OWL_OWL_WIDTH}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="portal-fade-owl__owl portal-fade-owl__owl--night"
              decoding="async"
              height={FADE_OWL_OWL_HEIGHT}
              src={FADE_OWL_RENDER_NIGHT_PATH}
              width={FADE_OWL_OWL_WIDTH}
            />
          </>
        )}
      </div>

      {!layersOnly ? (
        <>
          <div className="portal-fade-owl__editorial">
            <h1 className="portal-fade-owl__headline">
              {FADE_OWL_EDITORIAL.headlineLead}
              <br />
              {FADE_OWL_EDITORIAL.headlineRest}
            </h1>
            <p className="portal-fade-owl__subline">{FADE_OWL_EDITORIAL.subline}</p>
          </div>

          <div className="portal-fade-owl__vault-wrap">
            <section
              aria-labelledby="fade-owl-vault-title"
              className="portal-fade-owl__vault"
              data-portal-access-vault-placeholder=""
            >
              <h2 className="portal-fade-owl__vault-title" id="fade-owl-vault-title">
                {FADE_OWL_VAULT_COPY.title}
              </h2>

              <div aria-hidden="true" className="portal-fade-owl__vault-mock">
                <div className="portal-fade-owl__vault-field">
                  <span className="portal-fade-owl__vault-label">
                    {FADE_OWL_VAULT_COPY.emailLabel}
                  </span>
                  <span className="portal-fade-owl__vault-input">
                    {FADE_OWL_VAULT_COPY.emailPlaceholder}
                  </span>
                </div>
                <div className="portal-fade-owl__vault-field">
                  <div className="portal-fade-owl__vault-label-row">
                    <span className="portal-fade-owl__vault-label">
                      {FADE_OWL_VAULT_COPY.passwordLabel}
                    </span>
                    <span className="portal-fade-owl__vault-forgot">
                      {FADE_OWL_VAULT_COPY.forgot}
                    </span>
                  </div>
                  <span className="portal-fade-owl__vault-input portal-fade-owl__vault-input--password">
                    {FADE_OWL_VAULT_COPY.passwordPlaceholder}
                  </span>
                </div>
                <span className="portal-fade-owl__vault-submit">
                  {FADE_OWL_VAULT_COPY.submit}
                </span>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {showBeastmodeToggle && onModeChange ? (
        <button
          aria-label={isNight ? "Switch to day mode" : "Switch to night beastmode"}
          aria-pressed={isNight}
          className="portal-fade-owl__beastmode-toggle"
          onClick={() => onModeChange(isNight ? "light" : "night")}
          type="button"
        >
          <span aria-hidden="true">{isNight ? "Day" : "Night"}</span>
        </button>
      ) : null}
    </main>
  );
}

/** Interactive demo — day/night beastmode toggle. */
export function FadeOwlBeastmodeDemo({
  initialMode = "light",
  variant = "dual",
}: {
  readonly initialMode?: FadeOwlMode;
  readonly variant?: FadeOwlVariant;
}) {
  const [mode, setMode] = useState<FadeOwlMode>(initialMode);

  return (
    <FadeOwlPreview
      mode={mode}
      onModeChange={setMode}
      showBeastmodeToggle
      variant={variant}
    />
  );
}

/** @deprecated Use FadeOwlBeastmodeDemo — kept for story alias compatibility. */
export function FadeOwlCrossfadeDemo({
  initialMode = "light",
  variant = "dual",
}: {
  readonly initialMode?: FadeOwlMode;
  readonly variant?: FadeOwlVariant;
}) {
  return <FadeOwlBeastmodeDemo initialMode={initialMode} variant={variant} />;
}
