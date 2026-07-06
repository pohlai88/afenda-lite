import { DM_Sans, Fraunces } from "next/font/google";

export const fraunces = Fraunces({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

export const dmSans = DM_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});
