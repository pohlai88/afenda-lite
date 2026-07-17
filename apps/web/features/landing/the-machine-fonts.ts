import { Bodoni_Moda, DM_Mono, Inter } from "next/font/google";

/**
 * Landing-scoped faces for The Machine (not app-wide brand Geist).
 * Applied via CSS variables on `.the-machine` only.
 */
export const machineSans = Inter({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-machine-sans",
	display: "swap",
});

export const machineDisplay = Bodoni_Moda({
	subsets: ["latin"],
	weight: ["400", "500"],
	variable: "--font-machine-display",
	display: "swap",
});

export const machineMono = DM_Mono({
	subsets: ["latin"],
	weight: ["300", "400"],
	variable: "--font-machine-mono",
	display: "swap",
});

export const machineFontVariables = [
	machineSans.variable,
	machineDisplay.variable,
	machineMono.variable,
].join(" ");
