import { MAX_BEAMS, MAX_SHORT_NAME_LENGTH, MIN_BEAMS } from "./presets.js";
import { sprintf, type Translator } from "./i18n.js";

/**
 * Static markup with the hooks client.ts expects. Note and preset buttons
 * are left empty: client.ts builds them from the same arrays as the beams.
 * Only package constants and package catalogs are interpolated, never data
 * from attributes or storage.
 */
export function template({ _ }: Translator) {
  const beamCounts = Array.from(
    { length: MAX_BEAMS - MIN_BEAMS + 1 },
    (_unused, index) =>
      `<option value="${MIN_BEAMS + index}">${MIN_BEAMS + index}</option>`
  ).join("");
  return `
  <div class="harp-heading">
    <div>
      <strong>${_("Laser harp")}</strong>
      <span data-preset-title></span>
    </div>
    <button type="button" data-power aria-pressed="false" disabled>${_("Enable sound")}</button>
  </div>
  <p class="harp-instructions">
    ${_("Enable sound, then press and hold a beam with the mouse or a finger; you can slide between beams. You can also focus a note and hold Space or Enter. Hovering without pressing makes no sound.")}
    <span class="harp-keyboard-instructions">${_("With the harp focused, hold keys 1 to 0 to play the beams from left to right; 0 is the tenth beam.")}</span>
  </p>
  <div class="harp-stage">
    <canvas aria-hidden="true"></canvas>
    <span class="harp-stage-caption">${_("PLAY THE LIGHT")}</span>
    <span class="harp-emitter" aria-hidden="true"></span>
  </div>
  <div class="harp-notes" role="group" aria-label="${_("Harp notes, from left to right")}" data-notes></div>
  <div class="harp-presets" role="group" aria-label="${_("Select preset")}" data-preset-buttons></div>
  <div class="harp-controls">
    <button type="button" data-open-presets disabled>${_("Presets")}</button>
    <label>${_("Volume")} <input type="range" min="0" max="80" value="45" data-volume /></label>
  </div>
  <p class="harp-status" role="status" data-status>${_("Loading the instrument…")}</p>
  <dialog class="harp-editor" aria-label="${_("Configure presets")}">
    <form>
      <h2>${_("Presets")}</h2>
      <p>${sprintf(_("Up to five custom presets of %1$s to %2$s beams. The original RV2 preset keeps its nine notes and is always available."), MIN_BEAMS, MAX_BEAMS)}</p>
      <label>${_("Custom preset")} <select data-edit-preset></select></label>
      <div class="harp-editor-actions">
        <button type="button" data-add-preset>${_("New preset")}</button>
        <button type="button" data-delete-preset>${_("Delete preset")}</button>
      </div>
      <fieldset>
        <legend>${_("Preset settings")}</legend>
        <label>${_("Name")} <input data-preset-name required maxlength="40" /></label>
        <label>${_("Short name (button)")} <input data-preset-short-name required maxlength="${MAX_SHORT_NAME_LENGTH}" /></label>
        <label>${_("Number of beams")} <select data-beam-count>${beamCounts}</select></label>
        <div data-beam-rows></div>
      </fieldset>
      <p data-editor-status role="status"></p>
      <div class="harp-editor-actions">
        <button type="button" data-cancel-presets>${_("Cancel")}</button>
        <button type="submit">${_("Save changes")}</button>
      </div>
    </form>
  </dialog>`;
}
