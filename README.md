# music-laserharp

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A playable laser harp: a `<laser-harp>` Web Component with Three.js laser
beams and a Tone.js synthesizer, inspired by Jean-Michel Jarre's laser harp.
It works in any page or framework, with thin wrappers for Astro, React, and
Svelte. The interface is translated with gettext (English, Spanish, French,
German, and Chinese).

## Install

```bash
npm install @rgglez/music-laserharp
```

`three`, `tone`, and [@rgglez/i18n-gettext](https://github.com/rgglez/i18n-gettext)
are installed as dependencies. Three.js and Tone.js load lazily, only when a
harp connects to the page.

## Usage

All wrappers take the same props and render the same element:

| Prop         | Type       | Default                 | Description                                           |
| :----------- | :--------- | :---------------------- | :---------------------------------------------------- |
| `presets`    | `Preset[]` | `[]`                    | Initial custom presets; saved browser data wins       |
| `storageKey` | `string`   | `laser-harp:presets:v1` | `localStorage` key; use distinct keys for separate libraries |

### Astro

```astro
---
import LaserHarp from "@rgglez/music-laserharp/astro";
---

<LaserHarp />
```

It also works in MDX without a `client:*` directive. The wrapper validates
`presets` on the server, so invalid props fail the build.

### React

```jsx
import LaserHarp from "@rgglez/music-laserharp/react";

<LaserHarp presets={presets} storageKey="my-page:harp:v1" />;
```

React 18 or later. The element module is imported in `useEffect`, so the
wrapper is safe in server-rendered apps (Next.js, React Router).

### Svelte

```svelte
<script>
  import LaserHarp from "@rgglez/music-laserharp/svelte";
</script>

<LaserHarp {presets} storageKey="my-page:harp:v1" />
```

Svelte 4 or 5, including SvelteKit SSR (the element loads in `onMount`).

### Any other page

```html
<script type="module">
  import "@rgglez/music-laserharp";
</script>

<laser-harp storage-key="my-page:harp:v1" presets='[{"name":"Five","shortName":"Five","beams":[{"note":"C3"},{"note":"D3"},{"note":"E3"},{"note":"G3"},{"note":"A3"}]}]'></laser-harp>
```

The `presets` attribute is JSON. Both attributes are read when the element
connects: to apply new values, remount it (`key` in React, `{#key}` in
Svelte). With a bundler that still runs on the server, import the module only
in the browser: `class extends HTMLElement` cannot be evaluated in Node.

The package root also exports `parsePresets`, `DEFAULT_PRESET`,
`LASER_COLORS`, the limits, and the `Preset`, `Beam`, and `LaserColor` types.
`@rgglez/music-laserharp/presets` exports the same without defining the
element, for server-side validation.

## Language

The harp uses the nearest `lang` attribute: its own, a container's, or
`<html lang>`. Regional tags match their language (`es-MX` → `es`).
Languages without a catalog fall back to English. The language is read when
the element connects; remount it to switch.

| `lang` | Catalog              |
| :----- | :------------------- |
| `en`   | msgids (no catalog)  |
| `es`   | `src/locales/es.po`  |
| `fr`   | `src/locales/fr.po`  |
| `de`   | `src/locales/de.po`  |
| `zh`   | `src/locales/zh.po`  |

## Presets

The original **Second Rendez-Vous** preset is always available as the
**Jarre** button. It keeps its configured green beams and cannot be edited or
deleted. In addition, you can create **up to five custom presets**, each with
**five to ten beams**. A preset's array length determines its visible beam
count, its note-button count, and its synth voice count. Array order is left
to right; notes are not sorted, and repeated notes can have independent
colors.

```ts
interface Preset {
  name: string; // 1–40 characters, shown below the heading
  shortName?: string; // 1–16 characters, shown on its button
  beams: { note: string; color?: LaserColor }[]; // 5–10 beams
}
```

Notes cover the full MIDI range in scientific pitch notation (`C4` = MIDI 60)
with flats, for example `Db4`, not `C#4`. Colors are `red`, `green`
(default), `yellow`, `orange`, `white`, and `blue`; nothing else is accepted.

Open **Presets** to create, edit, or delete custom presets. Saving commits the
whole library and selects the edited preset; Cancel or Escape discards every
change. The modal uses the browser's native focus trap and blocks playing
behind it.

Saved presets persist in `localStorage` and take precedence over the
`presets` prop, including an empty saved library. Storage is validated before
use: invalid data falls back to the supplied presets without being overwritten
until the user saves. If storage is unavailable, editing still works for the
current page and a message explains that it cannot persist. Older libraries
without `shortName` use the first 16 characters of `name`. Instances sharing a
key load the library on mount; they are not synchronized live.

## Playing

Activate audio first. Press a beam with the primary mouse button, a finger,
or a pen, and keep contact while dragging to play other beams. **Hover is
silent**, and a press that begins outside the canvas does not activate it on
entry. Releasing, cancelling, or leaving the playable area releases notes.
Multiple fingers can share a beam without releasing its voice early.

The note buttons also support Space, Enter, and screen-reader activation. On
a hardware keyboard, hold `1` through `9`, then `0`, to play beams from left
to right (`0` is the tenth beam). Number shortcuts work while focus is inside
the harp, and ignore text fields, modified keys, and the preset modal. Only
the focused instrument responds when a page contains several harps.

Switching presets clears held contacts, disposes the previous audio graph,
rebuilds the beams and buttons, and restores the enabled state. Escape outside
the modal, losing window focus, hiding the page, or disabling audio stops the
instrument. Without WebGL, the note buttons remain playable. Volume is
independent for each instance.

## Rendering and synthesis

`presets.ts` is the shared configuration and validation boundary. `notes.ts`
contains hit-testing geometry. `editor.ts` owns an isolated editing draft;
`client.ts` coordinates contacts, storage, preset switching, and lifecycle.
`index.ts` defines the element, renders `template.ts`, injects `styles.ts`,
and lazily loads `client.ts`.

`scene.ts` uses one colored shader per beam, combining a bright core with soft
Gaussian halos and faint static haze to suggest light scattered in dry smoke.
Rendering only runs on changes and resize, with no idle animation loop.

`synth.ts` creates a separate voice for every beam, including repeated
pitches. Tone.js generates all audio without samples. A master sawtooth
controls a pulse shape through oversampled waveshaping. Each master period
resets the pulses, while a ratio sweep changes their harmonics without
changing the fundamental. A quieter pulse supplies the body. Amplitude and
filter envelopes, DC removal, chorus, delay, reverb, and a limiter complete the
sound. The filter envelope peak is bounded for the full MIDI range to stay
below Nyquist.

The timbre approximates the Elka Synthex rather than modeling its circuits or
reproducing its preset exactly. Residual aliasing can remain, especially at
high pitches. The historical reference is
[Paul Wiffen's account](https://www.soundonsound.com/reviews/elka-synthex-retrozone).

The default pitches are `C1 F1 G1 Ab1 Bb1 C2 D2 Eb2`, based on the `SynBass1`
and `Bass & Ld` solo tracks in
[Brian Havis's MIDI transcription](https://www.midi-karaoke.info/212dfee5.html).
This is a third-party transcription, not Jarre's official beam assignment.

## Styling

Styles are injected once into `<head>`, before other styles, with every
selector scoped under `laser-harp`. Override them with ordinary CSS of equal
or higher specificity, for example `laser-harp { margin-block: 0 }`.

## Translations

msgids are English. The catalogs live in `src/locales/` and are versioned as
both `.po` and the gettext-parser JSON the package imports.

```bash
make pot    # extract src/locales/messages.pot (xgettext 0.23+, -L TypeScript)
make po     # merge it into every .po and check them with msgfmt
make json   # convert .po to .json with gettext-po2json
```

`make json` runs [gettext-po2json](https://github.com/rgglez/gettext-po2json)
from `../gettext-po2json` (override with `PO2JSON=...`); it needs the Perl
module `Locale::PO` (`apt install liblocale-po-perl`). Use bare `_("...")`
calls in the code: `xgettext` does not extract member calls such as
`t._("...")`.

## Examples

`examples/astro`, `examples/react` (Vite), and `examples/svelte` (SvelteKit)
each render one harp with a language switch, using the package through
`file:../..`.

```bash
bun run build            # build the package first
cd examples/react
bun install
bun run dev
```

Rebuild the package and run `bun install` again in an example to pick up
changes. The React and Svelte examples set `resolve.dedupe` because a linked
package resolves to its real path, where optional peers are not installed.

## Development

```bash
bun install
bun test src
bun run build
```

## License

Copyright (c) 2026 Rodolfo González González.

Licensed under the [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
license. Read the [LICENSE](LICENSE) file.
