/** Inline script to apply theme before paint (avoids flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var k="app_color_theme";var t=localStorage.getItem(k);var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.dataset.colorTheme=d?"dark":"light";}catch(e){}})();`;
