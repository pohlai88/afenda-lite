/**
 * Comp-laptop atmosphere decoration — CSS-only layers on top of removebg owl base units.
 *
 * z-1 between background (z-0) and owl (z-2). Decorative only.
 */
export function PortalCelestialDeco() {
  return (
    <div
      aria-hidden="true"
      className="portal-celestial-deco"
      data-portal-celestial-deco=""
    >
      <div aria-hidden="true" className="portal-celestial-deco__wash" />
      <div aria-hidden="true" className="portal-celestial-deco__rings" />
      <div aria-hidden="true" className="portal-celestial-deco__glow" />
    </div>
  );
}
