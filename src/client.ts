import * as Tone from "tone";
import { BEAM_KEYS, beamForKey, hitBeam } from "./notes.js";
import { createHarpSynth } from "./synth.js";
import { createHarpScene } from "./scene.js";
import { createPresetEditor } from "./editor.js";
import {
  DEFAULT_PRESET,
  LASER_COLORS,
  parsePresets,
  type Preset,
} from "./presets.js";
import { sprintf, type Translator } from "./i18n.js";

/** Own all browser resources for one custom-element connection. */
export function mountHarp(
  root: HTMLElement,
  signal: AbortSignal,
  { _ }: Translator
) {
  const canvas = root.querySelector("canvas")!;
  const power = root.querySelector<HTMLButtonElement>("[data-power]")!;
  const volume = root.querySelector<HTMLInputElement>("[data-volume]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const noteGroup = root.querySelector<HTMLElement>("[data-notes]")!;
  const presetGroup = root.querySelector<HTMLElement>("[data-preset-buttons]")!;
  const presetTitle = root.querySelector<HTMLElement>("[data-preset-title]")!;
  const dialog = root.querySelector<HTMLDialogElement>("dialog")!;
  const storageKey = root.getAttribute("storage-key") || "laser-harp:presets:v1";
  const events = { signal };
  let customPresets = parsePresets(
    JSON.parse(root.getAttribute("presets") || "[]")
  );
  let storageMessage = "";
  // Browser storage can be disabled, malformed, or left over from another
  // version. Never trust its contents or overwrite it just because loading fails.
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) customPresets = parsePresets(JSON.parse(stored));
  } catch {
    storageMessage = _(
      "Could not restore the local settings; using the initial presets."
    );
  }
  let selectedPresetIndex = -1;
  let selectedPreset = DEFAULT_PRESET;
  let buttons: HTMLButtonElement[] = [];
  let scene: ReturnType<typeof createHarpScene> | undefined;
  let synth: ReturnType<typeof createHarpSynth> | undefined;
  let enabled = false;
  let generation = 0;
  // Hold ownership belongs to contacts, not pitches. Sharing a beam with two
  // fingers must release its voice only after the final finger has left.
  const held = new Map<string, { index: number; y: number }>();
  const pressedPointers = new Set<number>();
  const positions = new Map<number, { x: number; y: number }>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  try {
    scene = createHarpScene(canvas, selectedPreset.beams);
  } catch {
    canvas.hidden = true;
  }

  function showStatus(message: string) {
    status.textContent = [message, storageMessage].filter(Boolean).join(" ");
  }
  function paint() {
    const active = new Map<number, number>();
    held.forEach(({ index, y }) =>
      active.set(index, Math.max(y, active.get(index) ?? 0))
    );
    buttons.forEach((button, index) => {
      button.toggleAttribute("data-active", active.has(index));
      button.setAttribute("aria-pressed", String(active.has(index)));
    });
    scene?.update(active);
  }
  function setHeld(id: string, index: number, y = 0.5) {
    const previous = held.get(id);
    if (previous?.index === index) {
      held.set(id, { index, y });
      paint();
      return;
    }
    held.delete(id);
    if (
      previous &&
      ![...held.values()].some(contact => contact.index === previous.index)
    )
      synth?.release(previous.index);
    if (enabled && !dialog.open && index >= 0) {
      if (![...held.values()].some(contact => contact.index === index))
        synth?.attack(index);
      held.set(id, { index, y });
    }
    paint();
  }
  function clearContacts() {
    new Set([...held.values()].map(contact => contact.index)).forEach(index =>
      synth?.release(index)
    );
    held.clear();
    pressedPointers.clear();
    positions.clear();
    timers.forEach(clearTimeout);
    timers.clear();
    paint();
  }
  function stop() {
    // Invalidate pending async activation before disposing the audio graph.
    // A slow reverb initialization cannot revive audio after a preset switch.
    generation++;
    enabled = false;
    clearContacts();
    synth?.dispose();
    synth = undefined;
    buttons.forEach(button => {
      button.disabled = true;
    });
    power.disabled = false;
    power.textContent = _("Enable sound");
    power.setAttribute("aria-pressed", "false");
    showStatus(
      scene
        ? _("Sound is off. Press Enable sound to start.")
        : _("WebGL is not available. You can play with the note buttons.")
    );
  }
  async function start() {
    const attempt = ++generation;
    power.disabled = true;
    showStatus(_("Preparing the sound…"));
    try {
      await Tone.start();
      if (signal.aborted || attempt !== generation) return;
      synth = createHarpSynth(selectedPreset.beams);
      await synth.ready;
      if (signal.aborted || attempt !== generation) return;
      synth.volume(Number(volume.value) / 100);
      enabled = true;
      buttons.forEach(button => {
        button.disabled = false;
      });
      power.textContent = _("Disable sound");
      power.setAttribute("aria-pressed", "true");
      showStatus(
        scene
          ? _("Ready. Press and hold a beam or play a note.")
          : _("Ready. Play with the note buttons.")
      );
    } catch {
      if (!signal.aborted && attempt === generation) {
        stop();
        showStatus(
          _("Could not enable audio. Press Enable sound to try again.")
        );
      }
    } finally {
      if (!signal.aborted && attempt === generation) power.disabled = false;
    }
  }

  /** Rebuild controls from the same array used for graphics and synthesis. */
  function renderControls() {
    presetTitle.textContent = selectedPreset.name;
    noteGroup.style.setProperty(
      "--beam-count",
      String(selectedPreset.beams.length)
    );
    buttons = selectedPreset.beams.map((beam, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.note = String(index);
      button.textContent = beam.note.replace("b", "♭");
      button.setAttribute("aria-keyshortcuts", BEAM_KEYS[index]);
      button.title = sprintf(_("Key %1$s: %2$s"), BEAM_KEYS[index], beam.note);
      const color = LASER_COLORS[beam.color ?? "green"];
      button.style.setProperty("--beam-color", color.hex);
      button.setAttribute(
        "aria-label",
        sprintf(
          _("Play %1$s, beam %2$s, %3$s"),
          beam.note,
          index + 1,
          _(color.label).toLowerCase()
        )
      );
      button.setAttribute("aria-pressed", "false");
      button.disabled = !enabled;
      return button;
    });
    noteGroup.replaceChildren(...buttons);
    presetGroup.replaceChildren(
      ...[DEFAULT_PRESET, ...customPresets].map((preset, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.preset = String(index - 1);
        button.textContent = preset.shortName ?? preset.name;
        button.title = preset.name;
        button.setAttribute(
          "aria-pressed",
          String(index - 1 === selectedPresetIndex)
        );
        return button;
      })
    );
  }
  function selectPreset(index: number) {
    // Preserve the user's enabled/disabled choice, but dispose old voices and
    // effects before assigning new notes. No held contact survives the switch.
    const shouldRestart = enabled || power.disabled;
    stop();
    selectedPresetIndex = index;
    selectedPreset = index < 0 ? DEFAULT_PRESET : customPresets[index];
    renderControls();
    scene?.setBeams(selectedPreset.beams);
    if (shouldRestart) void start();
  }
  const editor = createPresetEditor(
    root,
    signal,
    { _ },
    (presets: Preset[], index: number) => {
      customPresets = presets;
      storageMessage = "";
      try {
        localStorage.setItem(storageKey, JSON.stringify(presets));
      } catch {
        storageMessage = _(
          "Changes work on this page, but the browser does not allow saving them for another visit."
        );
      }
      selectPreset(index);
    }
  );
  root.querySelector("[data-open-presets]")!.addEventListener(
    "click",
    () => {
      // Silence voices and their effect tails while the modal owns interaction.
      // Keep the enabled choice so closing the editor can restore playing mode.
      const wasEnabled = enabled;
      stop();
      dialog.dataset.resumeAudio = String(wasEnabled);
      editor.open(customPresets, selectedPresetIndex);
    },
    events
  );
  dialog.addEventListener(
    "close",
    () => {
      if (dialog.dataset.resumeAudio === "true" && !signal.aborted)
        void start();
      delete dialog.dataset.resumeAudio;
    },
    events
  );
  presetGroup.addEventListener(
    "click",
    event => {
      const button = (event.target as Element).closest<HTMLButtonElement>(
        "[data-preset]"
      );
      if (button) {
        // The selected button is replaced; retain keyboard focus on the harp.
        root.focus({ preventScroll: true });
        selectPreset(Number(button.dataset.preset));
      }
    },
    events
  );
  power.addEventListener(
    "click",
    () => {
      // Activation temporarily disables this button during async setup.
      // Move focus first so number keys work as soon as audio becomes ready.
      root.focus({ preventScroll: true });
      if (enabled) stop();
      else void start();
    },
    events
  );
  volume.addEventListener(
    "input",
    () => synth?.volume(Number(volume.value) / 100),
    events
  );

  function releasePointer(event: PointerEvent) {
    pressedPointers.delete(event.pointerId);
    positions.delete(event.pointerId);
    setHeld(`pointer:${event.pointerId}`, -1);
  }
  function move(event: PointerEvent) {
    // Hover is deliberately silent. A pointer must start with a primary press
    // on the canvas and remain captured; entering with a press from elsewhere
    // also stays silent. Touch and pen use the same ownership rules.
    if (
      !enabled ||
      !pressedPointers.has(event.pointerId) ||
      !canvas.hasPointerCapture(event.pointerId)
    )
      return;
    if (event.pointerType === "mouse" && !(event.buttons & 1)) {
      releasePointer(event);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    const previous = positions.get(event.pointerId) ?? point;
    // Interpolate pressed drags to avoid skipping thin hit areas when the
    // browser coalesces fast pointer events. This never runs for hover events.
    const steps = Math.min(
      100,
      Math.max(
        1,
        Math.ceil(
          Math.hypot(
            (point.x - previous.x) * rect.width,
            (point.y - previous.y) * rect.height
          ) / 6
        )
      )
    );
    for (let step = 1; step <= steps; step++) {
      const x = previous.x + ((point.x - previous.x) * step) / steps;
      const y = previous.y + ((point.y - previous.y) * step) / steps;
      setHeld(
        `pointer:${event.pointerId}`,
        hitBeam(x, y, rect.width, selectedPreset.beams.length),
        y
      );
    }
    positions.set(event.pointerId, point);
  }
  canvas.addEventListener(
    "pointerdown",
    event => {
      if (!enabled || dialog.open || event.button !== 0) return;
      event.preventDefault();
      // Keep number shortcuts scoped to the harp the player just touched.
      root.focus({ preventScroll: true });
      pressedPointers.add(event.pointerId);
      canvas.setPointerCapture(event.pointerId);
      move(event);
    },
    events
  );
  canvas.addEventListener("pointermove", move, events);
  for (const type of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const) {
    canvas.addEventListener(type, releasePointer, events);
    noteGroup.addEventListener(type, releasePointer, events);
  }
  canvas.addEventListener(
    "pointerleave",
    event => {
      if (!canvas.hasPointerCapture(event.pointerId)) releasePointer(event);
    },
    events
  );

  // Delegate note-button events so rebuilding a preset does not accumulate
  // listeners. Native buttons retain keyboard and assistive-tech access.
  const noteButton = (event: Event) =>
    (event.target as Element).closest<HTMLButtonElement>("[data-note]");
  noteGroup.addEventListener(
    "pointerdown",
    event => {
      const button = noteButton(event);
      if (!button || !enabled || event.button !== 0) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      setHeld(`pointer:${event.pointerId}`, Number(button.dataset.note));
    },
    events
  );
  noteGroup.addEventListener(
    "keydown",
    event => {
      const button = noteButton(event);
      if (!button || (event.key !== " " && event.key !== "Enter")) return;
      event.preventDefault();
      if (!event.repeat)
        setHeld(
          `key:${button.dataset.note}:${event.key}`,
          Number(button.dataset.note)
        );
    },
    events
  );
  noteGroup.addEventListener(
    "keyup",
    event => {
      const button = noteButton(event);
      if (!button || (event.key !== " " && event.key !== "Enter")) return;
      event.preventDefault();
      setHeld(`key:${button.dataset.note}:${event.key}`, -1);
    },
    events
  );
  noteGroup.addEventListener(
    "focusout",
    event => {
      const button = noteButton(event);
      if (!button) return;
      setHeld(`key:${button.dataset.note}: `, -1);
      setHeld(`key:${button.dataset.note}:Enter`, -1);
    },
    events
  );
  noteGroup.addEventListener(
    "click",
    event => {
      const button = noteButton(event);
      // Screen readers can activate a button without pointer or key events.
      if (!button || event.detail !== 0 || !enabled) return;
      const id = `accessible:${button.dataset.note}`;
      setHeld(id, Number(button.dataset.note));
      const timer = setTimeout(() => {
        setHeld(id, -1);
        timers.delete(timer);
      }, 220);
      timers.add(timer);
    },
    events
  );
  root.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape" && !dialog.open) stop();
      // A focused harp owns its shortcuts, so multiple instances cannot play
      // together by accident. Typing in controls or editing presets stays safe.
      if (
        !enabled ||
        dialog.open ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing ||
        (event.target as Element).closest(
          "input, textarea, select, [contenteditable]"
        )
      )
        return;
      const index = beamForKey(event.key, selectedPreset.beams.length);
      if (index < 0) return;
      event.preventDefault();
      // Each physical key owns one contact. Auto-repeat does not retrigger,
      // and mouse/touch contacts on the same beam keep their own ownership.
      if (!event.repeat) setHeld(`number:${event.code}`, index);
    },
    events
  );
  window.addEventListener(
    "keyup",
    event => {
      // Release even if focus or modifiers changed since the key went down.
      const id = `number:${event.code}`;
      if (held.has(id)) setHeld(id, -1);
    },
    events
  );
  root.addEventListener(
    "focusout",
    event => {
      if (
        event.relatedTarget instanceof Node &&
        root.contains(event.relatedTarget)
      )
        return;
      for (const id of held.keys()) {
        if (id.startsWith("number:")) setHeld(id, -1);
      }
    },
    events
  );
  // Losing focus must also cancel an editor's request to resume audio later.
  function deactivate() {
    delete dialog.dataset.resumeAudio;
    stop();
  }
  window.addEventListener("blur", deactivate, events);
  window.addEventListener("pagehide", deactivate, events);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) deactivate();
    },
    events
  );
  canvas.addEventListener(
    "webglcontextlost",
    event => {
      event.preventDefault();
      deactivate();
      showStatus(
        _("The graphics context was lost. Reload the page to restore the beams.")
      );
    },
    events
  );
  signal.addEventListener(
    "abort",
    () => {
      deactivate();
      dialog.close();
      scene?.dispose();
    },
    { once: true }
  );
  renderControls();
  stop();
  root.querySelector<HTMLButtonElement>("[data-open-presets]")!.disabled =
    false;
}
