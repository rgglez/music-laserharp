<script>
  import LaserHarp from "@rgglez/music-laserharp/svelte";

  const languages = ["es", "en", "fr", "de", "zh"];
  const presets = [
    {
      name: "Five colors",
      shortName: "Colors",
      beams: [
        { note: "C3", color: "red" },
        { note: "D3", color: "blue" },
        { note: "Eb3", color: "yellow" },
        { note: "G3", color: "orange" },
        { note: "C4" },
      ],
    },
  ];
  let lang = "es";
</script>

<main>
  <h1>music-laserharp · Svelte</h1>
  <label>
    Language
    <select bind:value={lang}>
      {#each languages as code}
        <option>{code}</option>
      {/each}
    </select>
  </label>
  <!-- The harp reads `lang` when it connects: {#key} remounts it. -->
  {#key lang}
    <div {lang}>
      <LaserHarp storageKey="example-svelte:presets:v1" {presets} />
    </div>
  {/key}
</main>

<style>
  main {
    max-width: 760px;
    margin: auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }
</style>
