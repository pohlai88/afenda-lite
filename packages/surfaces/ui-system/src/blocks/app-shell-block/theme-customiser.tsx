"use client";

import { useCallback } from "react";
import { Button } from "../../components/ui/button";
import type { ApplicationShellSettings } from "./application-shell-settings";
import { useApplicationShellSettings } from "./application-shell-settings-provider";

function SettingRadio({
	checked,
	label,
	onSelect,
}: Readonly<{ label: string; checked: boolean; onSelect: () => void }>) {
	return (
		<label className="flex items-center gap-2 text-sm">
			<input checked={checked} onChange={onSelect} type="radio" />
			{label}
		</label>
	);
}

export function ThemeCustomiser() {
	const { resetSettings, setSettings, settings } =
		useApplicationShellSettings();
	const update = useCallback(
		(patch: Partial<ApplicationShellSettings>) =>
			setSettings({ ...settings, ...patch }),
		[setSettings, settings],
	);
	const selectLight = useCallback(() => update({ mode: "light" }), [update]);
	const selectDark = useCallback(() => update({ mode: "dark" }), [update]);
	const selectCompact = useCallback(
		() => update({ layout: "compact" }),
		[update],
	);
	const selectFull = useCallback(() => update({ layout: "full" }), [update]);
	const selectDefaultSidebar = useCallback(
		() => update({ sidebarVariant: "sidebar" }),
		[update],
	);
	const selectInsetSidebar = useCallback(
		() => update({ sidebarVariant: "inset" }),
		[update],
	);
	const selectIconCollapse = useCallback(
		() => update({ sidebarCollapsible: "icon" }),
		[update],
	);
	const selectOffcanvasCollapse = useCallback(
		() => update({ sidebarCollapsible: "offcanvas" }),
		[update],
	);

	return (
		<div
			className="flex items-center gap-2"
			data-slot="app-shell-theme-customiser"
		>
			<Button
				aria-label="Customize appearance"
				size="sm"
				type="button"
				variant="outline"
			>
				Customize appearance
			</Button>
			<div className="sr-only">
				<p>Color mode</p>
				<SettingRadio
					checked={settings.mode === "light"}
					label="Light"
					onSelect={selectLight}
				/>
				<SettingRadio
					checked={settings.mode === "dark"}
					label="Dark"
					onSelect={selectDark}
				/>
				<p>Content layout</p>
				<SettingRadio
					checked={settings.layout === "compact"}
					label="Compact"
					onSelect={selectCompact}
				/>
				<SettingRadio
					checked={settings.layout === "full"}
					label="Full"
					onSelect={selectFull}
				/>
				<p>Sidebar variant</p>
				<SettingRadio
					checked={settings.sidebarVariant === "sidebar"}
					label="Default"
					onSelect={selectDefaultSidebar}
				/>
				<SettingRadio
					checked={settings.sidebarVariant === "inset"}
					label="Inset"
					onSelect={selectInsetSidebar}
				/>
				<p>Sidebar collapse</p>
				<SettingRadio
					checked={settings.sidebarCollapsible === "icon"}
					label="Icon"
					onSelect={selectIconCollapse}
				/>
				<SettingRadio
					checked={settings.sidebarCollapsible === "offcanvas"}
					label="Off-canvas"
					onSelect={selectOffcanvasCollapse}
				/>
				<Button onClick={resetSettings} type="button">
					Reset appearance
				</Button>
			</div>
		</div>
	);
}
