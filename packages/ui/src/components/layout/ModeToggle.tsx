"use client";

import { MoonStarIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

import type { Mode } from "../../contexts/settingsContext";
import { useSettings } from "../../hooks/use-settings";
import { Button } from "../ui/button";

const ModeToggle = () => {
	const { setTheme, resolvedTheme } = useTheme();
	const { settings, updateSettings } = useSettings();

	const handleModeChange = () => {
		const currentTheme = resolvedTheme || settings.mode || "light";
		const newMode: Mode = currentTheme === "dark" ? "light" : "dark";

		updateSettings({ mode: newMode });
		setTheme(newMode);
	};

	useEffect(() => {
		if (settings.mode) {
			setTheme(settings.mode);
		}
	}, [settings.mode, setTheme]);

	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative"
			onClick={handleModeChange}
		>
			<MoonStarIcon className="scale-100 dark:scale-0" />
			<SunIcon className="absolute scale-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
};

export default ModeToggle;
