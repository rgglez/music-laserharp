import {
  LASER_COLORS,
  MAX_CUSTOM_PRESETS,
  MAX_SHORT_NAME_LENGTH,
  MIN_BEAMS,
  NOTE_OPTIONS,
  parsePresets,
  type Preset,
} from "./presets.js";
import { sprintf, type Translator } from "./i18n.js";

/**
 * Edit a detached copy of the custom presets. Native dialog supplies focus
 * trapping, Escape dismissal, and an inert background. Cancel never commits.
 * The built-in Jarre preset deliberately stays outside this editable list.
 */
export function createPresetEditor(
  root: HTMLElement,
  signal: AbortSignal,
  { _ }: Pick<Translator, "_">,
  onSave: (presets: Preset[], selectedIndex: number) => void
) {
  const dialog = root.querySelector<HTMLDialogElement>("dialog")!;
  const form = dialog.querySelector("form")!;
  const selector =
    dialog.querySelector<HTMLSelectElement>("[data-edit-preset]")!;
  const nameInput =
    dialog.querySelector<HTMLInputElement>("[data-preset-name]")!;
  const shortNameInput = dialog.querySelector<HTMLInputElement>(
    "[data-preset-short-name]"
  )!;
  const countInput =
    dialog.querySelector<HTMLSelectElement>("[data-beam-count]")!;
  const rows = dialog.querySelector<HTMLElement>("[data-beam-rows]")!;
  const fields = dialog.querySelector<HTMLFieldSetElement>("fieldset")!;
  const addButton =
    dialog.querySelector<HTMLButtonElement>("[data-add-preset]")!;
  const deleteButton = dialog.querySelector<HTMLButtonElement>(
    "[data-delete-preset]"
  )!;
  const message = dialog.querySelector<HTMLElement>("[data-editor-status]")!;
  let draft: Preset[] = [];
  let selectedIndex = -1;
  const events = { signal };

  function makeSelect(
    label: string,
    options: { value: string; text: string }[],
    value: string
  ) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const select = document.createElement("select");
    options.forEach(option =>
      select.add(new Option(option.text, option.value))
    );
    select.value = value;
    wrapper.append(select);
    return wrapper;
  }

  function renderRows() {
    rows.replaceChildren();
    const preset = draft[selectedIndex];
    if (!preset) return;
    preset.beams.forEach((beam, index) => {
      const row = document.createElement("div");
      row.className = "harp-beam-row";
      const note = makeSelect(
        sprintf(_("Beam %1$s: note"), index + 1),
        NOTE_OPTIONS.map(note => ({
          value: note,
          text: note.replace("b", "♭"),
        })),
        beam.note
      );
      const color = makeSelect(
        sprintf(_("Beam %1$s: color"), index + 1),
        Object.entries(LASER_COLORS).map(([value, entry]) => ({
          value,
          text: _(entry.label),
        })),
        beam.color ?? "green"
      );
      note.querySelector("select")!.dataset.beamNote = String(index);
      color.querySelector("select")!.dataset.beamColor = String(index);
      row.append(note, color);
      rows.append(row);
    });
  }

  function render() {
    selector.replaceChildren(
      ...draft.map((preset, index) => new Option(preset.name, String(index)))
    );
    selector.value = String(selectedIndex);
    selector.disabled = draft.length === 0;
    fields.disabled = draft.length === 0;
    deleteButton.disabled = draft.length === 0;
    addButton.disabled = draft.length >= MAX_CUSTOM_PRESETS;
    nameInput.value = draft[selectedIndex]?.name ?? "";
    shortNameInput.value = draft[selectedIndex]?.shortName ?? "";
    countInput.value = String(draft[selectedIndex]?.beams.length ?? MIN_BEAMS);
    message.textContent = sprintf(
      _("%1$s of %2$s custom presets. Changes apply when you save."),
      draft.length,
      MAX_CUSTOM_PRESETS
    );
    renderRows();
  }

  // Delegation keeps listeners stable when beam rows are replaced. User names
  // are always assigned through textContent/Option, never parsed as HTML.
  nameInput.addEventListener(
    "input",
    () => {
      if (selectedIndex < 0) return;
      draft[selectedIndex].name = nameInput.value;
      selector.options[selectedIndex].text = nameInput.value || _("Untitled");
    },
    events
  );
  // Keep the short label independent: changing the full name must not replace
  // the user's chosen button text. Both fields remain part of the draft.
  shortNameInput.addEventListener(
    "input",
    () => {
      if (selectedIndex < 0) return;
      draft[selectedIndex].shortName = shortNameInput.value;
    },
    events
  );
  rows.addEventListener(
    "change",
    event => {
      const select = event.target as HTMLSelectElement;
      const preset = draft[selectedIndex];
      if (select.dataset.beamNote !== undefined) {
        preset.beams[Number(select.dataset.beamNote)].note = select.value;
      } else if (select.dataset.beamColor !== undefined) {
        // The value comes from a fixed palette; parsePresets validates it again
        // at commit time before it reaches either CSS or the WebGL renderer.
        const beam = preset.beams[Number(select.dataset.beamColor)];
        beam.color = select.value as keyof typeof LASER_COLORS;
      }
    },
    events
  );
  countInput.addEventListener(
    "change",
    () => {
      const beams = draft[selectedIndex].beams;
      const count = Number(countInput.value);
      while (beams.length < count) beams.push({ note: "C4", color: "green" });
      beams.length = count;
      renderRows();
    },
    events
  );
  selector.addEventListener(
    "change",
    () => {
      selectedIndex = Number(selector.value);
      render();
    },
    events
  );
  addButton.addEventListener(
    "click",
    () => {
      if (draft.length >= MAX_CUSTOM_PRESETS) return;
      const name = sprintf(_("Preset %1$s"), draft.length + 1);
      draft.push({
        name,
        shortName: name,
        beams: ["C4", "D4", "E4", "G4", "A4"].map(note => ({
          note,
          color: "green",
        })),
      });
      selectedIndex = draft.length - 1;
      render();
      nameInput.focus();
    },
    events
  );
  deleteButton.addEventListener(
    "click",
    () => {
      if (selectedIndex < 0) return;
      draft.splice(selectedIndex, 1);
      selectedIndex = Math.min(selectedIndex, draft.length - 1);
      render();
    },
    events
  );
  form.addEventListener(
    "submit",
    event => {
      event.preventDefault();
      try {
        const presets = parsePresets(draft);
        onSave(presets, selectedIndex);
        dialog.close();
      } catch {
        message.textContent = sprintf(
          _(
            "Check the names (1–40 characters), short names (1–%1$s), notes, and colors of all presets."
          ),
          MAX_SHORT_NAME_LENGTH
        );
      }
    },
    events
  );
  dialog
    .querySelector("[data-cancel-presets]")!
    .addEventListener("click", () => dialog.close(), events);
  return {
    open(presets: Preset[], currentIndex: number) {
      draft = structuredClone(presets);
      selectedIndex = draft.length ? Math.max(0, currentIndex) : -1;
      render();
      dialog.showModal();
    },
  };
}
