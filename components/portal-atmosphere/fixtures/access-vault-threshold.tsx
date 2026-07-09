/**
 * Access Vault integrated into a glowing shield/keyhole threshold —
 * Dual Guardian Facade only. Visual mock matching product copy from
 * `portalCopy.signIn`; no Neon Auth, no form actions.
 */
import { ShieldCheck } from "lucide-react";
import { portalCopy } from "@/lib/copy/portal-copy";

export function AccessVaultThreshold() {
  return (
    <div className="portal-vault-threshold" data-portal-vault-threshold="">
      <div aria-hidden="true" className="portal-vault-threshold__shield">
        <span
          aria-hidden="true"
          className="portal-vault-threshold__shield-hole"
        />
        <span
          aria-hidden="true"
          className="portal-vault-threshold__shield-keyway"
        />
      </div>

      <section
        aria-labelledby="dual-guardian-vault-title"
        className="portal-vault-threshold__card"
        data-portal-access-vault-placeholder=""
      >
        <div className="portal-vault-threshold__heading">
          <ShieldCheck
            aria-hidden="true"
            className="portal-vault-threshold__icon"
          />
          <h2
            className="portal-vault-threshold__title"
            id="dual-guardian-vault-title"
          >
            {portalCopy.signIn.title}
          </h2>
        </div>

        <div aria-hidden="true" className="portal-vault-threshold__mock-form">
          <div className="portal-vault-threshold__mock-field">
            <span className="portal-vault-threshold__mock-label">
              {portalCopy.signIn.emailLabel}
            </span>
            <span className="portal-vault-threshold__mock-input">
              name@organization.com
            </span>
          </div>

          <div className="portal-vault-threshold__mock-field">
            <span className="portal-vault-threshold__mock-label">
              {portalCopy.signIn.passwordLabel}
            </span>
            <span className="portal-vault-threshold__mock-input portal-vault-threshold__mock-input--password">
              ••••••••
            </span>
          </div>

          <span className="portal-vault-threshold__unlock">
            {portalCopy.signIn.submit}
          </span>
        </div>
      </section>
    </div>
  );
}
