/**
 * Static Portal Atmosphere background layers.
 *
 * Layer contract:
 * - z-0: base canvas
 * - z-1: atmospheric glow fields and static texture/grid hints
 *
 * PA-P2 boundary:
 * - No owl layer
 * - No hero typography
 * - No seal
 * - No access card
 * - No auth wiring
 * - No motion
 */
export function PortalBackgroundLayers() {
  return (
    <div
      aria-hidden="true"
      className="portal-background-layers"
      data-portal-background-layers=""
    >
      <div className="portal-background-layers__canvas" />
      <div className="portal-background-layers__glow portal-background-layers__glow--primary" />
      <div className="portal-background-layers__glow portal-background-layers__glow--soft" />
      <div className="portal-background-layers__grid" />
    </div>
  );
}
