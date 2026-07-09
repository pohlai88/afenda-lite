import type { GuardianCopy, GuardianMode } from "./types";

type Props = {
  /** Both modes mounted for sky-cycle crossfade. */
  copyByMode: Record<GuardianMode, GuardianCopy>;
  mode: GuardianMode;
};

function EditorialCopySet({
  copy,
  surface,
}: {
  copy: GuardianCopy;
  surface: GuardianMode;
}) {
  return (
    <div
      className={`editorial-copy__set editorial-copy__set--${surface}`}
      data-guardian-editorial-set={surface}
      aria-hidden="true"
    >
      <p className="editorial-copy__headline">{copy.headline}</p>

      {copy.subheadline ? (
        <p className="editorial-copy__subheadline">{copy.subheadline}</p>
      ) : null}

      {copy.proofline ? (
        <p className="editorial-copy__proofline">
          <span className="editorial-copy__proof-icon" aria-hidden="true">
            ♢
          </span>
          {copy.proofline}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Sky-cycle poster — dual readable sentence layers (no flip / mirror).
 * Active set follows mode; ambient CSS crossfades both layers over 48s.
 */
export function EditorialPosterCopy({ copyByMode, mode }: Props) {
  const active = copyByMode[mode];
  const accessibleHeading = active.headline.replace(/\.$/, "");

  return (
    <div
      className="editorial-copy editorial-copy--sky"
      data-guardian-editorial-variant="sky"
      data-mode={mode}
    >
      <h1 className="sr-only">{accessibleHeading}</h1>
      <EditorialCopySet copy={copyByMode.day} surface="day" />
      <EditorialCopySet copy={copyByMode.night} surface="night" />
    </div>
  );
}
