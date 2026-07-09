/**
 * Dual Guardian Facade atmosphere — celestial gold rings, subtle marble
 * wash, and the glow behind the Access Vault shield/keyhole threshold.
 *
 * CSS-only (`portal-atmosphere.dual-guardian-facade.css`). Decorative;
 * excluded from the accessibility tree. Storybook fixture only.
 */
export function PortalDualGuardianDeco() {
  return (
    <div
      aria-hidden="true"
      className="portal-dual-guardian-deco"
      data-portal-dual-guardian-deco=""
    >
      <div aria-hidden="true" className="portal-dual-guardian-deco__marble" />
      <div aria-hidden="true" className="portal-dual-guardian-deco__rings" />
      <div
        aria-hidden="true"
        className="portal-dual-guardian-deco__threshold-glow"
      />
    </div>
  );
}
