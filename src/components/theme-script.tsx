/**
 * Blocking inline script, rendered in <head> before any paint. Reads the
 * viewer's stored light/dark choice (falling back to the OS preference) and
 * stamps it on <html data-theme> immediately — this is what lets `dark:`
 * Tailwind utilities and globals.css's [data-theme="dark"] block respond to
 * a manual toggle instead of only prefers-color-scheme, with no flash.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
