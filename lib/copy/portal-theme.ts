export const PORTAL_THEME_STORAGE_KEY = "client-declaration-theme";

/** Inline boot script — prevents theme flash before React hydrates. */
export const PORTAL_THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${PORTAL_THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
