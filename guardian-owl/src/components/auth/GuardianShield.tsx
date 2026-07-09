import type { GuardianMode, GuardianState } from "./types";

type Props = {
  mode: GuardianMode;
  state: GuardianState;
};

export function GuardianShield({ mode, state }: Props) {
  return (
    <div className="guardian-shield" data-mode={mode} data-state={state}>
      <div className="guardian-shield__rings" />
      <div className="guardian-shield__core">
        {state === "success" ? (
          <span className="guardian-shield__symbol guardian-shield__symbol--check" aria-hidden="true" />
        ) : state === "warning" || state === "error" ? (
          <span className="guardian-shield__symbol guardian-shield__symbol--warning" aria-hidden="true" />
        ) : (
          <span className="guardian-shield__symbol guardian-shield__symbol--keyhole" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
