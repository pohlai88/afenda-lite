"use client";

import { useTheme } from "next-themes";
import {
	createContext,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
} from "react";

import themeConfig from "../configs/themeConfig";
import { useObjectCookie } from "../hooks/use-object-cookie";
import { FONT_CONFIG } from "../utils/fonts";
import { themePresets } from "../utils/theme-presets";
import {
	initialSettings,
	RADIUS_VALUES,
	type Settings,
} from "./settings-types";

export type {
	Collapsible,
	FontKey,
	Layout,
	Mode,
	Radius,
	Scale,
	Settings,
	ThemePresetKey,
	Variant,
} from "./settings-types";
export { initialSettings, RADIUS_VALUES } from "./settings-types";

const PRESET_CSS_VARS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
	"shadow-color",
	"shadow-opacity",
	"shadow-blur",
	"shadow-spread",
	"shadow-offset-x",
	"shadow-offset-y",
] as const;

type BroadcastMessage = {
	type: "SETTINGS_UPDATED";
	payload: Settings;
};

type SettingsContextValue = {
	settings: Settings;
	updateSettings: (settings: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
	children,
	settingsCookie,
}: {
	children: ReactNode;
	settingsCookie?: Settings;
}) {
	const { setTheme, resolvedTheme } = useTheme();
	const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

	const [cookie, updateCookie] = useObjectCookie<Settings>(
		themeConfig.settingsCookieName,
		{
			...initialSettings,
			...settingsCookie,
		},
	);

	const settings: Settings = useMemo(
		() => ({ ...initialSettings, ...cookie }),
		[cookie],
	);

	useEffect(() => {
		if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
			return;
		}

		try {
			if (!broadcastChannelRef.current) {
				broadcastChannelRef.current = new BroadcastChannel(
					themeConfig.settingsCookieName,
				);
			}

			const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
				const { type, payload } = event.data;

				if (type === "SETTINGS_UPDATED") {
					updateCookie(payload);
				}
			};

			broadcastChannelRef.current.onmessage = handleMessage;

			return () => {
				broadcastChannelRef.current?.close();
				broadcastChannelRef.current = null;
			};
		} catch {
			broadcastChannelRef.current = null;
		}
	}, [updateCookie]);

	const broadcastSettingsUpdate = (updatedSettings: Settings) => {
		if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
			return;
		}

		if (!broadcastChannelRef.current) {
			try {
				broadcastChannelRef.current = new BroadcastChannel(
					themeConfig.settingsCookieName,
				);
			} catch {
				return;
			}
		}

		try {
			broadcastChannelRef.current.postMessage({
				type: "SETTINGS_UPDATED",
				payload: updatedSettings,
			} satisfies BroadcastMessage);
		} catch {
			try {
				broadcastChannelRef.current.close();
			} catch {
				// ignore
			}
			broadcastChannelRef.current = null;
		}
	};

	const updateSettings = (newSettings: Partial<Settings>) => {
		const updatedSettings = { ...settings, ...newSettings };

		updateCookie(updatedSettings);

		if (newSettings.mode) {
			setTheme(newSettings.mode);
		}

		broadcastSettingsUpdate(updatedSettings);
	};

	useEffect(() => {
		setTheme(settings.mode);
	}, [settings.mode, setTheme]);

	useEffect(() => {
		const root = document.documentElement;

		if (settings.themePreset === "default") {
			for (const key of PRESET_CSS_VARS) {
				root.style.removeProperty(`--${key}`);
			}
			return;
		}

		const preset = themePresets[settings.themePreset];

		if (!preset) {
			return;
		}

		const mode = resolvedTheme === "dark" ? "dark" : "light";

		for (const [key, value] of Object.entries(preset.styles[mode])) {
			if (value !== undefined) {
				root.style.setProperty(`--${key}`, value);
			}
		}
	}, [settings.themePreset, resolvedTheme]);

	useEffect(() => {
		document.documentElement.style.setProperty(
			"--radius",
			RADIUS_VALUES[settings.radius],
		);
	}, [settings.radius]);

	useEffect(() => {
		if (settings.scale === "md") {
			document.documentElement.removeAttribute("data-theme-scale");
		} else {
			document.documentElement.setAttribute("data-theme-scale", settings.scale);
		}
	}, [settings.scale]);

	useEffect(() => {
		const root = document.documentElement;
		const fontVar = FONT_CONFIG[settings.font]?.variable ?? "--font-geist-sans";
		const resolved = getComputedStyle(root).getPropertyValue(fontVar).trim();

		if (resolved) {
			root.style.setProperty("font-family", resolved);
			root.style.setProperty("--font-sans", resolved);
		} else {
			root.style.setProperty("font-family", `var(${fontVar})`);
			root.style.setProperty("--font-sans", `var(${fontVar})`);
		}
	}, [settings.font]);

	return (
		<SettingsContext.Provider value={{ settings, updateSettings }}>
			{children}
		</SettingsContext.Provider>
	);
}

export { SettingsContext };
