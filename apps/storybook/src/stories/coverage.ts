export const CVA_COVERAGE = {
	alert: { variant: ["default", "destructive"] },
	badge: {
		variant: [
			"default",
			"secondary",
			"destructive",
			"outline",
			"ghost",
			"link",
		],
	},
	"button-group": { orientation: ["horizontal", "vertical"] },
	button: {
		variant: [
			"default",
			"destructive",
			"outline",
			"secondary",
			"ghost",
			"link",
		],
		size: [
			"default",
			"xs",
			"sm",
			"lg",
			"icon",
			"icon-xs",
			"icon-sm",
			"icon-lg",
		],
	},
	empty: { size: ["sm", "md", "lg"] },
	field: { orientation: ["vertical", "horizontal", "responsive"] },
	"form-error": {
		variant: ["default", "warning", "info"],
		size: ["sm", "md", "lg"],
	},
	"input-group": {
		align: ["inline-start", "inline-end", "block-start", "block-end"],
		size: ["xs", "sm", "icon-xs", "icon-sm"],
	},
	"key-value": {
		orientation: ["vertical", "horizontal", "inline"],
		size: ["sm", "md", "lg"],
	},
	"metric-card": { trend: ["up", "down", "neutral"] },
	sidebar: {
		variant: ["default", "outline"],
		size: ["default", "sm", "lg"],
	},
	spinner: {
		size: ["sm", "md", "lg", "xl"],
		variant: ["default", "secondary", "destructive"],
	},
	"status-badge": {
		status: ["success", "pending", "error", "warning", "inactive", "active"],
		size: ["sm", "md", "lg"],
	},
	tabs: { variant: ["default", "line"] },
	toggle: {
		variant: ["default", "outline"],
		size: ["default", "sm", "lg"],
	},
} as const;
