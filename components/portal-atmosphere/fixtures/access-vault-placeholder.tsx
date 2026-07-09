/**
 * Comp-aligned Access Vault placeholder for laptop hero design review.
 *
 * Visual-only mock — matches auth-hero-*.png vault chrome; no Neon Auth.
 */
import { ShieldCheck } from "lucide-react";

export function AccessVaultPlaceholder() {
  return (
    <section
      aria-labelledby="access-vault-title"
      className="portal-access-placeholder portal-access-vault-placeholder"
      data-portal-access-vault-placeholder=""
    >
      <div className="portal-access-vault-placeholder__heading">
        <ShieldCheck
          aria-hidden="true"
          className="portal-access-vault-placeholder__icon"
        />
        <h2
          className="portal-access-vault-placeholder__title"
          id="access-vault-title"
        >
          Access Vault
        </h2>
      </div>

      <div className="portal-access-placeholder__mock-form" aria-hidden="true">
        <div className="portal-access-placeholder__mock-field">
          <span className="portal-access-placeholder__mock-label">Email</span>
          <span className="portal-access-vault-placeholder__mock-input portal-access-vault-placeholder__mock-input--email">
            name@example.com
          </span>
        </div>

        <div className="portal-access-placeholder__mock-field">
          <span className="portal-access-placeholder__mock-label">Password</span>
          <span className="portal-access-vault-placeholder__mock-input portal-access-vault-placeholder__mock-input--password">
            ••••••••
          </span>
        </div>

        <span className="portal-access-placeholder__mock-button portal-access-vault-placeholder__unlock">
          Unlock
        </span>

        <p className="portal-access-vault-placeholder__footer-link">
          Create account →
        </p>
      </div>
    </section>
  );
}
