"use client";

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
			<input type="radio" checked={checked} onChange={onSelect} />
			{label}
		</label>
	);
}

export function ThemeCustomiser() {
	const { resetSettings, setSettings, settings } =
		useApplicationShellSettings();
	const update = (patch: Partial<ApplicationShellSettings>) =>
		setSettings({ ...settings, ...patch });

	return (
		<div
			data-slot="app-shell-theme-customiser"
			className="flex items-center gap-2"
		>
			<Button
				type="button"
				variant="outline"
				size="sm"
				aria-label="Customize appearance"
			>
				Customize appearance
			</Button>
			<div className="sr-only">
				<p>Color mode</p>
				<SettingRadio
					label="Light"
					checked={settings.mode === "light"}
					onSelect={() => update({ mode: "light" })}
				/>
				<SettingRadio
					label="Dark"
					checked={settings.mode === "dark"}
					onSelect={() => update({ mode: "dark" })}
				/>
				<p>Content layout</p>
				<SettingRadio
					label="Compact"
					checked={settings.layout === "compact"}
					onSelect={() => update({ layout: "compact" })}
				/>
				<SettingRadio
					label="Full"
					checked={settings.layout === "full"}
					onSelect={() => update({ layout: "full" })}
				/>
				<p>Sidebar variant</p>
				<SettingRadio
					label="Default"
					checked={settings.sidebarVariant === "sidebar"}
					onSelect={() => update({ sidebarVariant: "sidebar" })}
				/>
				<SettingRadio
					label="Inset"
					checked={settings.sidebarVariant === "inset"}
					onSelect={() => update({ sidebarVariant: "inset" })}
				/>
				<p>Sidebar collapse</p>
				<SettingRadio
					label="Icon"
					checked={settings.sidebarCollapsible === "icon"}
					onSelect={() => update({ sidebarCollapsible: "icon" })}
				/>
				<SettingRadio
					label="Off-canvas"
					checked={settings.sidebarCollapsible === "offcanvas"}
					onSelect={() => update({ sidebarCollapsible: "offcanvas" })}
				/>
				<Button type="button" onClick={resetSettings}>
					Reset appearance
				</Button>
			</div>
		</div>
	);
}
