import type { GuardianCopy } from "./types";

type Props = {
  copy: GuardianCopy;
};

export function EditorialPosterCopy({ copy }: Props) {
  return (
    <div className="editorial-copy">
      <h1 className="editorial-copy__headline">{copy.headline}</h1>

      {copy.subheadline && (
        <p className="editorial-copy__subheadline">{copy.subheadline}</p>
      )}

      {copy.proofline && (
        <p className="editorial-copy__proofline">
          <span className="editorial-copy__proof-icon" aria-hidden="true">♢</span>
          {copy.proofline}
        </p>
      )}
    </div>
  );
}
