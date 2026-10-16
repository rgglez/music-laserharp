// Styles from the original Astro component, prefixed with the element name
// instead of Astro's scoping. Injected once, before other styles, so a page
// can override them with ordinary CSS.
const CSS = `
laser-harp:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
laser-harp .harp-keyboard-instructions {
  display: none;
}
@media (hover: hover) and (pointer: fine) {
  laser-harp .harp-keyboard-instructions {
    display: inline;
  }
}
laser-harp {
  display: block;
  overflow: hidden;
  margin-block: 2rem;
  padding: 1.25rem;
  border: 1px solid #284c3c;
  border-radius: 1rem;
  background: #07110e;
  color: #e1f9ea;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}
laser-harp .harp-heading,
laser-harp .harp-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
laser-harp .harp-heading strong {
  display: block;
  color: #effff5;
  font-size: 1.35rem;
}
laser-harp .harp-heading span,
laser-harp .harp-instructions,
laser-harp .harp-status {
  font-size: 0.85rem;
  color: #a6c6b3;
}
laser-harp .harp-instructions {
  margin: 0.8rem 0 1rem;
}
laser-harp .harp-stage {
  position: relative;
  height: clamp(280px, 55vw, 400px);
  background: radial-gradient(ellipse at 50% 95%, #14502c55, transparent 65%);
}
laser-harp canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
laser-harp canvas[hidden] {
  display: none;
}
laser-harp .harp-stage-caption {
  position: absolute;
  top: 43%;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 0.65rem;
  letter-spacing: 0.4em;
  color: #a0c4ad;
  pointer-events: none;
}
laser-harp .harp-emitter {
  position: absolute;
  bottom: 3%;
  left: 39%;
  width: 22%;
  height: 8px;
  border-radius: 50%;
  background: #183f2a;
  box-shadow: 0 0 20px #3bff8244;
  pointer-events: none;
}
laser-harp .harp-notes {
  display: grid;
  grid-template-columns: repeat(var(--beam-count, 9), minmax(0, 1fr));
  gap: 0.3rem;
  margin-block: 0.7rem 1rem;
}
laser-harp button {
  min-height: 44px;
  border: 1px solid #406d52;
  border-radius: 0.4rem;
  background: #10261b;
  color: #d9fbe6;
  padding: 0.45rem 0.8rem;
  font: inherit;
  cursor: pointer;
  touch-action: none;
}
laser-harp .harp-notes button {
  border-top: 3px solid var(--beam-color, #43ff87);
  padding: 0.4rem 0;
  font-size: 0.8rem;
}
laser-harp .harp-notes button[data-active] {
  background: var(--beam-color, #9bffb9);
  color: #05200f;
  box-shadow: 0 0 15px var(--beam-color, #62ff78);
}
laser-harp button:disabled {
  opacity: 0.5;
  cursor: default;
}
laser-harp button:focus-visible,
laser-harp input:focus-visible,
laser-harp select:focus-visible {
  outline: 2px solid #c3ff93;
  outline-offset: 4px;
}
laser-harp .harp-controls label {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.85rem;
}
laser-harp input[type="range"] {
  width: 110px;
  accent-color: #79ee9b;
}
laser-harp .harp-status {
  min-height: 1.5em;
  margin: 0.9rem 0 0;
}
laser-harp .harp-presets,
laser-harp .harp-editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 1rem;
}
laser-harp .harp-presets button {
  overflow-wrap: anywhere;
}
laser-harp .harp-presets button[aria-pressed="true"] {
  border-color: #b4ffd0;
  background: #245335;
}
laser-harp .harp-editor {
  box-sizing: border-box;
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 1.25rem;
  border: 1px solid #406d52;
  border-radius: 1rem;
  background: #0b1b13;
  color: #e1f9ea;
  color-scheme: dark;
}
laser-harp .harp-editor::backdrop {
  background: #000b;
  backdrop-filter: blur(4px);
}
laser-harp .harp-editor h2 {
  margin: 0;
  color: inherit;
  font-size: 1.4rem;
}
laser-harp .harp-editor p {
  font-size: 0.85rem;
}
laser-harp .harp-editor fieldset {
  padding: 0.8rem;
  border: 1px solid #406d52;
  min-width: 0;
}
laser-harp .harp-editor label {
  display: grid;
  gap: 0.35rem;
  margin-block: 0.6rem;
  font-size: 0.85rem;
}
laser-harp .harp-editor select,
laser-harp .harp-editor input {
  box-sizing: border-box;
  min-height: 44px;
  min-width: 0;
  width: 100%;
  border: 1px solid #406d52;
  border-radius: 0.3rem;
  padding: 0.4rem;
  background: #10261b;
  color: #e1f9ea;
  font: inherit;
}
laser-harp .harp-editor .harp-beam-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}
@media (max-width: 450px) {
  laser-harp {
    padding: 0.75rem;
  }
  laser-harp .harp-notes {
    gap: 0.15rem;
  }
}
`;

export function injectStyles() {
  if (document.getElementById("laser-harp-styles")) return;
  const style = document.createElement("style");
  style.id = "laser-harp-styles";
  style.textContent = CSS;
  document.head.prepend(style);
}
