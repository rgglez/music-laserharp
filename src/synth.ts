import * as Tone from "tone";
import type { Beam } from "./presets.js";

/**
 * Build one independent voice per beam, including repeated pitches. Each harp
 * owns this entire graph, so disposing it never mutes other harp instances.
 * The master waveform resets the slave pulse every period: this approximates
 * hard sync. Tone.Oscillator.sync() only follows the transport clock.
 */
export function createHarpSynth(beams: readonly Beam[]) {
  // Effects feed a limiter before the instance volume control. Sharing these
  // effects across voices keeps the sound coherent and limits node allocation.
  const output = new Tone.Gain(0.45).toDestination();
  const limiter = new Tone.Limiter(-3).connect(output);
  const reverb = new Tone.Reverb({
    decay: 2.8,
    preDelay: 0.025,
    wet: 0.2,
  }).connect(limiter);
  const delay = new Tone.FeedbackDelay({
    delayTime: 0.28,
    feedback: 0.23,
    wet: 0.16,
  }).connect(reverb);
  const chorus = new Tone.Chorus({
    frequency: 0.7,
    delayTime: 3.5,
    depth: 0.45,
    wet: 0.28,
  })
    .connect(delay)
    .start();
  // Remove the DC component introduced by the asymmetric pulse waveform.
  const dcBlock = new Tone.Filter(20, "highpass").connect(chorus);
  const voices = beams.map(({ note }) => {
    // Each beam owns its envelopes; two identical notes can be released
    // independently without interrupting one another.
    const frequency = Tone.Frequency(note).toFrequency();
    const amp = new Tone.AmplitudeEnvelope({
      attack: 0.008,
      decay: 0.65,
      sustain: 0.58,
      release: 0.22,
    }).connect(dcBlock);
    const level = new Tone.Gain(0.12).connect(amp);
    const filter = new Tone.Filter({
      frequency: 1200,
      type: "lowpass",
      rolloff: -24,
      Q: 0.8,
    }).connect(level);
    const filterEnvelope = new Tone.FrequencyEnvelope({
      attack: 0.006,
      decay: 0.5,
      sustain: 0.22,
      release: 0.2,
      // Keep the envelope peak below Nyquist, including high MIDI notes.
      baseFrequency: Math.min(
        450 + frequency * 3,
        Math.min(18000, Tone.getContext().sampleRate * 0.45) / 2 ** 3.4
      ),
      octaves: 3.4,
    }).connect(filter.frequency);
    // Map the master sawtooth from [-1, 1] to a phase ramp in [0, 1].
    // The ratio controls how many slave pulses fit inside one master cycle.
    const master = new Tone.Oscillator(frequency, "sawtooth");
    const phaseGain = new Tone.Multiply(0.5);
    const phaseOffset = new Tone.Add(0.5);
    const ratio = new Tone.Multiply(0.25);
    // Oversampling softens aliasing from the nonlinear pulse shaper.
    // This is a timbral approximation, not a circuit model of the Synthex.
    const slave = new Tone.WaveShaper(
      x => Math.tanh(5 * (Math.sin(2 * Math.PI * 8 * x) - 0.18)),
      8192
    );
    slave.oversample = "4x";
    master.chain(phaseGain, phaseOffset, ratio, slave, filter);
    // Mix a quieter fundamental pulse beneath the sweeping harmonics.
    const body = new Tone.PulseOscillator({
      frequency,
      width: 0.38,
      volume: -12,
    }).connect(filter);
    master.start();
    body.start();
    return {
      amp,
      filterEnvelope,
      ratio,
      attackedAt: 0,
      nodes: [
        master,
        body,
        phaseGain,
        phaseOffset,
        ratio,
        slave,
        filter,
        filterEnvelope,
        level,
        amp,
      ],
    };
  });
  return {
    ready: reverb.ready,
    attack(index: number) {
      // Cancel any pending release before retriggering during a fast drag.
      // The ratio sweep changes the spectrum while preserving the pitch.
      const voice = voices[index];
      const time = Tone.now();
      voice.attackedAt = time;
      voice.ratio.factor.cancelScheduledValues(time);
      voice.ratio.factor.setValueAtTime(0.76, time);
      voice.ratio.factor.exponentialRampToValueAtTime(0.255, time + 0.72);
      voice.amp.cancel(time);
      voice.filterEnvelope.cancel(time);
      voice.amp.triggerAttack(time);
      voice.filterEnvelope.triggerAttack(time);
    },
    release(index: number) {
      const voice = voices[index];
      // Give a quickly crossed beam enough gate time for an audible attack.
      const time = Math.max(Tone.now(), voice.attackedAt + 0.065);
      voice.amp.triggerRelease(time);
      voice.filterEnvelope.triggerRelease(time);
    },
    volume(value: number) {
      output.gain.rampTo(value, 0.03);
    },
    dispose() {
      // Preset switches also dispose effect tails, preventing old voices from
      // bleeding into the new assignment or continuing after navigation.
      voices.forEach(voice => voice.nodes.forEach(node => node.dispose()));
      [dcBlock, chorus, delay, reverb, limiter, output].forEach(node =>
        node.dispose()
      );
    },
  };
}
