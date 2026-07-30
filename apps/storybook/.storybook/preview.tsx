import type { Decorator, Preview } from "@storybook/react-vite";
import { type ReactNode, useEffect } from "react";
import "../src/storybook.css";

function AfendaThemeBoundary({
	children,
	theme,
}: {
	children: ReactNode;
	theme: "light" | "dark";
}) {
	useEffect(() => {
		const { documentElement } = document;
		const hadLightTheme = documentElement.classList.contains("light");
		const hadDarkTheme = documentElement.classList.contains("dark");

		documentElement.classList.remove("light", "dark");
		documentElement.classList.add(theme);

		return () => {
			documentElement.classList.remove("light", "dark");
			if (hadLightTheme) {
				documentElement.classList.add("light");
			}
			if (hadDarkTheme) {
				documentElement.classList.add("dark");
			}
		};
	}, [theme]);

	return (
		<div className="min-h-screen bg-background p-6 font-sans">{children}</div>
	);
}

const withAfendaTheme: Decorator = (Story, context) => {
	const theme = context.globals.theme === "dark" ? "dark" : "light";
	return (
		<AfendaThemeBoundary theme={theme}>
			<Story />
		</AfendaThemeBoundary>
	);
};

const preview = {
	decorators: [withAfendaTheme],
	initialGlobals: {
		theme: "light",
	},
	globalTypes: {
		theme: {
			description: "Afenda color scheme",
			toolbar: {
				icon: "paintbrush",
				items: [
					{ value: "light", title: "Light" },
					{ value: "dark", title: "Dark" },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		layout: "fullscreen",
		controls: {
			expanded: true,
			disableSaveFromUI: true,
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: "error",
		},
		viewport: {
			options: {
				mobile: {
					name: "Mobile 390 × 844",
					styles: { width: "390px", height: "844px" },
				},
				tablet: {
					name: "Tablet 768 × 1024",
					styles: { width: "768px", height: "1024px" },
				},
				desktop: {
					name: "Desktop 1440 × 900",
					styles: { width: "1440px", height: "900px" },
				},
			},
		},
	},
} satisfies Preview;

export default preview;
