/**
 * Static access-slot placeholder.
 *
 * PA-P6 layout + PA-P7 design review copy.
 * No Neon Auth, credentials, or submit handlers.
 */
export function AccessSlotPlaceholder() {
  return (
    <div
      className="portal-access-placeholder"
      data-portal-access-placeholder=""
      aria-label="Access preview"
    >
      <p className="portal-access-placeholder__eyebrow">Access Vault</p>

      <div className="portal-access-placeholder__header">
        <h2 className="portal-access-placeholder__title">Credential chamber</h2>
        <p className="portal-access-placeholder__copy">
          Placeholder only. Authentication is not mounted in this fixture.
        </p>
      </div>

      <div className="portal-access-placeholder__mock-form" aria-hidden="true">
        <div className="portal-access-placeholder__mock-field">
          <span className="portal-access-placeholder__mock-label">Email</span>
          <span className="portal-access-placeholder__mock-input" />
        </div>

        <div className="portal-access-placeholder__mock-field">
          <span className="portal-access-placeholder__mock-label">
            Verification
          </span>
          <span className="portal-access-placeholder__mock-input" />
        </div>

        <span className="portal-access-placeholder__mock-button">
          Continue
        </span>
      </div>

      <div className="portal-access-placeholder__footer">
        Layout preview only — authentication wires in a later slice.
      </div>
    </div>
  );
}
