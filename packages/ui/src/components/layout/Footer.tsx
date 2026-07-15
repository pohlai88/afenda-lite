"use client";

import { useSettings } from "../../hooks/use-settings";
import { cn } from "../../lib/utils";

const Footer = () => {
	const { settings } = useSettings();

	return (
		<footer>
			<div
				className={cn(
					"text-muted-foreground mx-auto flex size-full items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6",
					settings.layout === "compact" ? "max-w-360" : "w-full",
				)}
			>
				<p className="text-sm text-balance max-sm:text-center">
					{`©${new Date().getFullYear()}`}{" "}
					<a
						href="https://afenda-lite.vercel.app"
						target="_blank"
						rel="noreferrer"
						className="text-primary hover:underline"
					>
						Afenda-Lite
					</a>
					, enterprise multi-module SaaS
				</p>
				<div className="flex items-center gap-5 max-sm:hidden">
					<a
						href="/account/settings"
						className="text-muted-foreground hover:text-foreground text-sm transition duration-300"
					>
						Account
					</a>
					<a
						href="/client/dashboard"
						className="text-muted-foreground hover:text-foreground text-sm transition duration-300"
					>
						Workspace
					</a>
					<a
						href="/fft/events"
						className="text-muted-foreground hover:text-foreground text-sm transition duration-300"
					>
						Feed Farm Trade
					</a>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
