import { createTranslator, type Translator } from "@rgglez/i18n-gettext";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import zh from "./locales/zh.json";

export { sprintf, type Translator } from "@rgglez/i18n-gettext";

/**
 * Translator for the language in effect at `element`: its own `lang`, a
 * container's, or `<html lang>`. English msgids need no catalog.
 * ponytail: read once at mount; remount the element to change language.
 */
export function translatorFor(element: Element): Translator {
  const lang = element.closest("[lang]")?.getAttribute("lang") || "en";
  return createTranslator(lang, { de, es, fr, zh });
}
