<script>
  // Svelte wrapper for <laser-harp>, compatible with Svelte 4 and 5. The
  // element module loads in onMount: `class extends HTMLElement` cannot be
  // evaluated during SSR. Props are read when the element connects; wrap it
  // in {#key ...} to apply new ones.
  import { onMount } from "svelte";

  /** Initial custom presets; saved browser data takes precedence. */
  /** @type {import("../dist/presets.js").Preset[]} */
  export let presets = [];
  /** Separate keys give multiple instruments independent saved libraries. */
  /** @type {string | undefined} */
  export let storageKey = undefined;

  onMount(() => {
    import("../dist/index.js");
  });
</script>

<laser-harp presets={JSON.stringify(presets)} storage-key={storageKey}
></laser-harp>
