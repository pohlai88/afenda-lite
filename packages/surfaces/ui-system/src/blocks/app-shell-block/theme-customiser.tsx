"use client";

import { MoonIcon, Settings2Icon, SunIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "../../components/ui/sheet";
import type {
	ApplicationShellSettings,
	AppShellColorMode,
} from "./application-shell-settings";
import { useApplicationShellSettings } from "./application-shell-settings-provider";

type SettingOption = Readonly<{ label: string; value: string }>;

function SettingGroup({
	label,
	onValueChange,
	options,
	value,
}: Readonly<{
	label: string;
	onValueChange: (value: string) => void;
	options: readonly SettingOption[];
	value: string;
}>) {
	const groupId = `app-shell-${label.toLowerCase().replaceAll(" ", "-")}`;
	return (
		<fieldset className="flex flex-col gap-3">
			<legend className="font-medium text-sm">{label}</legend>
			<RadioGroup
				aria-label={label}
				onValueChange={onValueChange}
				value={value}
			>
				{options.map((option) => {
					const id = `${groupId}-${option.value}`;
					return (
						<div className="flex items-center gap-2" key={option.value}>
							<RadioGroupItem id={id} value={option.value} />
							<Label htmlFor={id}>{option.label}</Label>
						</div>
					);
				})}
			</RadioGroup>
		</fieldset>
	);
}

export function ColorModeToggle() {
	const { setSettings, settings } = useApplicationShellSettings();
	const toggleMode = useCallback(() => {
		const nextMode: AppShellColorMode =
			settings.mode === "dark" ? "light" : "dark";
		setSettings({ ...settings, mode: nextMode });
	}, [setSettings, settings]);
	const isDark = settings.mode === "dark";
	return (
		<Button
			aria-label={`Use ${isDark ? "light" : "dark"} color mode`}
			onClick={toggleMode}
			size="icon-sm"
			type="button"
			variant="ghost"
		>
			{isDark ? <SunIcon /> : <MoonIcon />}
		</Button>
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
	const setMode = useCallback(
		(mode: string) => {
			if (mode === "light" || mode === "dark" || mode === "system") {
				update({ mode });
			}
		},
		[update],
	);
	const setLayout = useCallback(
		(layout: string) => {
			if (
				layout === "comfortable" ||
				layout === "compact" ||
				layout === "full"
			) {
				update({ layout });
			}
		},
		[update],
	);
	const setSidebarVariant = useCallback(
		(sidebarVariant: string) => {
			if (
				sidebarVariant === "sidebar" ||
				sidebarVariant === "floating" ||
				sidebarVariant === "inset"
			) {
				update({ sidebarVariant });
			}
		},
		[update],
	);
	const setSidebarCollapsible = useCallback(
		(sidebarCollapsible: string) => {
			if (
				sidebarCollapsible === "offcanvas" ||
				sidebarCollapsible === "icon" ||
				sidebarCollapsible === "none"
			) {
				update({ sidebarCollapsible });
			}
		},
		[update],
	);

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					aria-label="Customize appearance"
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<Settings2Icon />
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Workspace appearance</SheetTitle>
					<SheetDescription>
						Choose one consistent density and navigation treatment for this
						workspace.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-6 overflow-y-auto px-4">
					<SettingGroup
						label="Color mode"
						onValueChange={setMode}
						options={[
							{ label: "System", value: "system" },
							{ label: "Light", value: "light" },
							{ label: "Dark", value: "dark" },
						]}
						value={settings.mode}
					/>
					<SettingGroup
						label="Content layout"
						onValueChange={setLayout}
						options={[
							{ label: "Comfortable", value: "comfortable" },
							{ label: "Compact", value: "compact" },
							{ label: "Full", value: "full" },
						]}
						value={settings.layout}
					/>
					<SettingGroup
						label="Sidebar variant"
						onValueChange={setSidebarVariant}
						options={[
							{ label: "Default", value: "sidebar" },
							{ label: "Floating", value: "floating" },
							{ label: "Inset", value: "inset" },
						]}
						value={settings.sidebarVariant}
					/>
					<SettingGroup
						label="Sidebar collapse"
						onValueChange={setSidebarCollapsible}
						options={[
							{ label: "Off-canvas", value: "offcanvas" },
							{ label: "Icon", value: "icon" },
							{ label: "None", value: "none" },
						]}
						value={settings.sidebarCollapsible}
					/>
				</div>
				<SheetFooter>
					<Button onClick={resetSettings} type="button" variant="outline">
						Reset appearance
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
