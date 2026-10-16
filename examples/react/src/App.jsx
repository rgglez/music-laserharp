import { useState } from "react";
import LaserHarp from "@rgglez/music-laserharp/react";

const LANGUAGES = ["es", "en", "fr", "de", "zh"];
const PRESETS = [
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

export default function App() {
  const [lang, setLang] = useState("es");
  return (
    <>
      <h1>music-laserharp · React</h1>
      <label>
        Language{" "}
        <select value={lang} onChange={event => setLang(event.target.value)}>
          {LANGUAGES.map(code => (
            <option key={code}>{code}</option>
          ))}
        </select>
      </label>
      {/* The harp reads `lang` when it connects: a new key remounts it. */}
      <div key={lang} lang={lang}>
        <LaserHarp storageKey="example-react:presets:v1" presets={PRESETS} />
      </div>
    </>
  );
}
