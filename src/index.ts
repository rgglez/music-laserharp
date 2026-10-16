import { translatorFor } from "./i18n.js";
import { injectStyles } from "./styles.js";
import { template } from "./template.js";

export {
  DEFAULT_PRESET,
  LASER_COLORS,
  MAX_BEAMS,
  MAX_CUSTOM_PRESETS,
  MIN_BEAMS,
  parsePresets,
  type Beam,
  type LaserColor,
  type Preset,
} from "./presets.js";

/**
 * `<laser-harp presets="[...]" storage-key="...">`. Both attributes are read
 * once per connection. The language comes from the nearest `lang` attribute.
 */
class LaserHarp extends HTMLElement {
  private controller?: AbortController;

  connectedCallback() {
    // Frameworks can reconnect the same element. Each connection gets a fresh
    // controller, which also guards against a late lazy-import resolution.
    if (this.controller) return;
    const controller = new AbortController();
    this.controller = controller;
    const t = translatorFor(this);
    // Bare `_()` calls: xgettext does not extract member calls like `t._()`.
    const { _ } = t;
    injectStyles();
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-label"))
      this.setAttribute("aria-label", _("Laser harp"));
    this.innerHTML = template(t);
    // Three.js and Tone.js load only when a harp is actually on the page.
    import("./client.js")
      .then(({ mountHarp }) => {
        if (!controller.signal.aborted) mountHarp(this, controller.signal, t);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          this.querySelector("[data-status]")!.textContent = _(
            "Could not load the instrument. Reload the page to try again."
          );
        }
      });
  }

  disconnectedCallback() {
    // Abort releases listeners, audio, the modal, and GPU resources without
    // changing the shared Tone context or any other component instance.
    this.controller?.abort();
    this.controller = undefined;
  }
}

if (!customElements.get("laser-harp"))
  customElements.define("laser-harp", LaserHarp);
