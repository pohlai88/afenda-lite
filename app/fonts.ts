import { Cormorant_Garamond, Inter } from "next/font/google";

/**
 * UI sans — form fields, labels, body copy.
 * Inter: neutral grotesque, engineered for screen legibility.
 */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Editorial serif — hero display, headings.
 * Cormorant Garamond: extreme hairline/bold contrast (Didot / Bodoni family),
 * designed for large display sizes. Load 300 for feather-light display, 500 for
 * mid-weight titles, 700 for bold emphasis. Italic for decorative dividers.
 */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
});

export const portalFontClassName = `${inter.variable} ${cormorant.variable} font-sans`;
