import { createElement, useEffect } from "react";
import type { Preset } from "./presets.js";

export type { Preset } from "./presets.js";

/**
 * React wrapper for `<laser-harp>`. The element module is imported after
 * mount because `class extends HTMLElement` cannot be evaluated during SSR.
 * Props are read when the element connects; change `key` to apply new ones.
 */
export default function LaserHarp({
  presets = [],
  storageKey,
}: {
  /** Initial custom presets; saved browser data takes precedence. */
  presets?: Preset[];
  /** Separate keys give multiple instruments independent saved libraries. */
  storageKey?: string;
}) {
  useEffect(() => {
    void import("./index.js");
  }, []);
  return createElement("laser-harp", {
    presets: JSON.stringify(presets),
    "storage-key": storageKey,
  });
}
