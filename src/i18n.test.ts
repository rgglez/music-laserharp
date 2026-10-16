import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translatorFor } from "./i18n";
import { LASER_COLORS } from "./presets";

const locales = new URL("./locales/", import.meta.url);
const msgids = [
  ...readFileSync(new URL("messages.pot", locales), "utf8").matchAll(
    /^msgid (".+")$/gm
  ),
].map(([, quoted]) => JSON.parse(quoted) as string);
const placeholders = (text: string) =>
  (text.match(/%\d+\$s/g) ?? []).sort().join();

const at = (lang: string | null) =>
  translatorFor({
    closest: () => (lang === null ? null : { getAttribute: () => lang }),
  } as unknown as Element);

for (const lang of ["es", "fr", "de", "zh"]) {
  test(`${lang} translates every msgid and keeps its placeholders`, () => {
    const catalog = JSON.parse(
      readFileSync(new URL(`${lang}.json`, locales), "utf8")
    );
    const { _ } = at(lang);
    for (const msgid of msgids) {
      assert.ok(catalog.translations.app[msgid]?.msgstr[0], `${lang}: ${msgid}`);
      assert.equal(placeholders(_(msgid)), placeholders(msgid), msgid);
    }
  });
}

test("language comes from the nearest lang attribute, English by default", () => {
  assert.equal(at("es-MX")._("Enable sound"), "Activar sonido");
  assert.equal(at("pt")._("Enable sound"), "Enable sound");
  assert.equal(at(null)._("Enable sound"), "Enable sound");
});

test("every laser color label is extracted for translation", () => {
  for (const { label } of Object.values(LASER_COLORS))
    assert.ok(msgids.includes(label), label);
});
