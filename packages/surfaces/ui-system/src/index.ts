/**
 * @afenda/ui-system — flat public barrel.
 *
 * The ONE public import surface: `import { Button, Card } from "@afenda/ui-system"`.
 * Do NOT add `"use client"` here — interactive components carry their own
 * directive in their own source file, which is preserved across this re-export.
 */

// Display / layout primitives
export * from "./components/ui/accordion";
export * from "./components/ui/alert";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/async-state";
export * from "./components/ui/avatar";
export * from "./components/ui/badge";
// Navigation
export * from "./components/ui/breadcrumb";
export * from "./components/ui/bulk-action-bar";
// Form primitives
export * from "./components/ui/button";
export * from "./components/ui/button-group";
export * from "./components/ui/calendar";
export * from "./components/ui/card";
export * from "./components/ui/change-diff";
export * from "./components/ui/chart";
export * from "./components/ui/checkbox";
export * from "./components/ui/code";
export * from "./components/ui/collapsible";
export * from "./components/ui/column-visibility-menu";
// Overlays / menus
export * from "./components/ui/combobox";
export * from "./components/ui/command";
export * from "./components/ui/context-menu";
// Data display
export * from "./components/ui/data-table";
export * from "./components/ui/date-picker";
export * from "./components/ui/date-time-picker";
export * from "./components/ui/dialog";
export * from "./components/ui/drawer";
export * from "./components/ui/dropdown-menu";
// Empty states
export * from "./components/ui/empty";
export * from "./components/ui/field";
export * from "./components/ui/file-upload";
export * from "./components/ui/filter-bar";
export * from "./components/ui/form-error";
export * from "./components/ui/form-field";
export * from "./components/ui/hover-card";
export * from "./components/ui/input";
export * from "./components/ui/input-group";
export * from "./components/ui/kbd";
export * from "./components/ui/key-value";
export * from "./components/ui/label";
export * from "./components/ui/master-detail";
export * from "./components/ui/menubar";
export * from "./components/ui/metric-card";
export * from "./components/ui/native-select";
export * from "./components/ui/numeric-input";
export * from "./components/ui/page-header";
export * from "./components/ui/pagination";
export * from "./components/ui/popover";
export * from "./components/ui/progress";
export * from "./components/ui/radio-group";
export * from "./components/ui/resizable";
export * from "./components/ui/saved-view-select";
export * from "./components/ui/scroll-area";
export * from "./components/ui/search-field";
export * from "./components/ui/select";
export * from "./components/ui/separator";
export * from "./components/ui/sheet";
export * from "./components/ui/sidebar";
/** Cookie name/max-age — non-client; RSC shells read → `SidebarProvider defaultOpen`. */
export {
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
} from "./components/ui/sidebar-cookie";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/sonner";
export * from "./components/ui/spinner";
export * from "./components/ui/status-badge";
export * from "./components/ui/stepper";
export * from "./components/ui/switch";
export * from "./components/ui/table";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/timeline";
export * from "./components/ui/toggle";
export * from "./components/ui/toggle-group";
export * from "./components/ui/toolbar";
export * from "./components/ui/tooltip";
export * from "./components/ui/tree-view";
export { cn } from "./lib/utils";
