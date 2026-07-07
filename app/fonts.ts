import { EB_Garamond, Lato } from "next/font/google";

export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-lato",
});

export const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-eb-garamond",
});

export const portalFontClassName = `${lato.variable} ${ebGaramond.variable} font-sans`;
