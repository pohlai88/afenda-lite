import type { ReactNode } from "react";

import type { Settings } from "../contexts/settingsContext";
import { SettingsProvider } from "../contexts/settingsContext";
import { ThemeProvider } from "./ThemeProvider";
import { SidebarProvider } from "./ui/sidebar";
import { TooltipProvider } from "./ui/tooltip";

type Props = {
	children: ReactNode;
	settingsCookie?: Settings;
	sidebarDefaultOpen?: boolean;
};

const Providers = ({ children, settingsCookie, sidebarDefaultOpen }: Props) => {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={settingsCookie?.mode ?? "system"}
			enableSystem={true}
		>
			<SettingsProvider settingsCookie={settingsCookie}>
				<TooltipProvider>
					<SidebarProvider defaultOpen={sidebarDefaultOpen}>
						{children}
					</SidebarProvider>
				</TooltipProvider>
			</SettingsProvider>
		</ThemeProvider>
	);
};

export default Providers;
