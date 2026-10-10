/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;
let musicGainNode: GainNode | null = null;
let isMusicPlaying = false;
let musicTimer: number | null = null;
let activeMusicNodes: (OscillatorNode | GainNode)[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Volume Levels (0.0 to 1.0)
let currentSoundVolume = 0.8;
let currentMusicVolume = 0.8;

export function setSoundVolume(volume: number) {
  currentSoundVolume = Math.max(0, Math.min(1, volume));
}

export function getSoundVolume(): number {
  return currentSoundVolume;
}

export function setMusicVolume(volume: number) {
  currentMusicVolume = Math.max(0, Math.min(1, volume));
  const ctx = getAudioContext();
  if (ctx && musicGainNode && isMusicPlaying) {
    try {
      musicGainNode.gain.cancelScheduledValues(ctx.currentTime);
      musicGainNode.gain.setValueAtTime(musicGainNode.gain.value, ctx.currentTime);
      musicGainNode.gain.linearRampToValueAtTime(0.92 * currentMusicVolume, ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }
}

export function getMusicVolume(): number {
  return currentMusicVolume;
}

/**
 * Preview chime for real-time sound volume adjustment feedback
 */
export function playSoundVolumePreview(volume: number) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.09); // A5

    const peak = 0.45 * Math.max(0, Math.min(1, volume));
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore
  }
}

/**
 * Pick up a block from tray (Louder, crisp pop)
 */
export function playPickSound(enabled = true) {
  if (!enabled || currentSoundVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.08);

    const peak = 0.35 * currentSoundVolume;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio failures
  }
}

/**
 * Place a piece on the board (Louder, tactile solid lock)
 */
export function playPlaceSound(enabled = true) {
  if (!enabled || currentSoundVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.14);

    const peak = 0.58 * currentSoundVolume;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Ignore
  }
}

/**
 * Clear rows/columns and trigger combo (Louder, bright sparkling chime)
 */
export function playClearSound(combo = 1, enabled = true) {
  if (!enabled || currentSoundVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Pentatonic scale notes based on combo
    const baseFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    const notes = [
      baseFreqs[combo % baseFreqs.length],
      baseFreqs[(combo + 2) % baseFreqs.length],
      baseFreqs[(combo + 4) % baseFreqs.length],
    ];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      const peak = 0.55 * currentSoundVolume;
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.07);
      gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
    });
  } catch {
    // Ignore
  }
}

/**
 * Game Over sound (Louder, arcade descent)
 */
export function playGameOverSound(enabled = true) {
  if (!enabled || currentSoundVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const freqs = [360, 300, 240, 180];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      const peak = 0.28 * currentSoundVolume;
      gain.gain.setValueAtTime(peak, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.2);
    });
  } catch {
    // Ignore
  }
}

// -------------------------------------------------------------
// CHILL AMBIENT BACKGROUND MUSIC GENERATOR (Web Audio API)
// -------------------------------------------------------------

// Chord progression: Cmaj7 -> Am9 -> Fmaj7 -> Gsus4
const CHORD_PROGRESSION = [
  { root: 65.41, notes: [130.81, 196.0, 246.94, 329.63] }, // Cmaj7 (C2 root, C3, G3, B3, E4)
  { root: 55.0, notes: [110.0, 164.81, 196.0, 246.94] },  // Am9 (A1 root, A2, E3, G3, B3)
  { root: 43.65, notes: [87.31, 130.81, 164.81, 220.0] },  // Fmaj7 (F1 root, F2, C3, E3, A3)
  { root: 49.0, notes: [98.0, 146.83, 196.0, 246.94] },   // G7 (G1 root, G2, D3, G3, B3)
];

const CHILL_LEAD_NOTES = [523.25, 659.25, 783.99, 987.77, 1046.5]; // C5, E5, G5, B5, C6
let chordIndex = 0;

let compressorNode: DynamicsCompressorNode | null = null;

function scheduleChillChord(ctx: AudioContext, masterMusicGain: GainNode) {
  if (!isMusicPlaying) return;

  const chord = CHORD_PROGRESSION[chordIndex % CHORD_PROGRESSION.length];
  chordIndex++;

  const chordDuration = 3.6; // seconds per chord
  const now = ctx.currentTime;

  try {
    // 1. Warm Filter - opened up to 3200Hz for vibrant, audible presence (3x clearer)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(0.9, now);
    filter.connect(masterMusicGain);

    // 2. Sub Bass (Warm Sine, boosted ~2x)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(chord.root, now);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.75, now + 0.4);
    subGain.gain.linearRampToValueAtTime(0.001, now + chordDuration);

    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start(now);
    subOsc.stop(now + chordDuration);
    activeMusicNodes.push(subOsc);

    // 3. Polyphonic Warm Synth Pad (Boosted 3x louder: 0.14 -> 0.42)
    chord.notes.forEach((freq, idx) => {
      // Primary Oscillator
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(freq, now);

      // Warm attack envelope
      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.linearRampToValueAtTime(0.42, now + 0.6 + idx * 0.05);
      padGain.gain.linearRampToValueAtTime(0.001, now + chordDuration);

      padOsc.connect(padGain);
      padGain.connect(filter);
      padOsc.start(now);
      padOsc.stop(now + chordDuration);
      activeMusicNodes.push(padOsc);

      // Detuned secondary oscillator for lush stereo chorus (Boosted 3x: 0.10 -> 0.32)
      const detunedOsc = ctx.createOscillator();
      const detunedGain = ctx.createGain();
      detunedOsc.type = 'sine';
      detunedOsc.frequency.setValueAtTime(freq * 1.004, now); // +7 cents

      detunedGain.gain.setValueAtTime(0.001, now);
      detunedGain.gain.linearRampToValueAtTime(0.32, now + 0.7);
      detunedGain.gain.linearRampToValueAtTime(0.001, now + chordDuration);

      detunedOsc.connect(detunedGain);
      detunedGain.connect(filter);
      detunedOsc.start(now);
      detunedOsc.stop(now + chordDuration);
      activeMusicNodes.push(detunedOsc);
    });

    // 4. Ambient Sparkle Bell (Boosted 3x: 0.09 -> 0.28)
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    const bellNote = CHILL_LEAD_NOTES[Math.floor(Math.random() * CHILL_LEAD_NOTES.length)];
    const bellTime = now + 1.4;

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(bellNote, bellTime);

    bellGain.gain.setValueAtTime(0.001, bellTime);
    bellGain.gain.linearRampToValueAtTime(0.28, bellTime + 0.04);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 1.4);

    bellOsc.connect(bellGain);
    bellGain.connect(filter);
    bellOsc.start(bellTime);
    bellOsc.stop(bellTime + 1.4);
    activeMusicNodes.push(bellOsc);
  } catch {
    // Ignore audio schedule exceptions
  }

  // Schedule next chord slightly before current one finishes for seamless crossfade
  if (isMusicPlaying) {
    musicTimer = window.setTimeout(() => {
      if (isMusicPlaying) {
        scheduleChillChord(ctx, masterMusicGain);
      }
    }, (chordDuration - 0.25) * 1000);
  }
}

/**
 * Starts chill looping background music (significantly louder, rich & crisp)
 */
export function startBackgroundMusic(enabled = true) {
  if (!enabled || isMusicPlaying) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    isMusicPlaying = true;

    // Use Dynamics Compressor to prevent clipping and enhance punch
    if (!compressorNode) {
      compressorNode = ctx.createDynamicsCompressor();
      compressorNode.threshold.setValueAtTime(-14, ctx.currentTime);
      compressorNode.knee.setValueAtTime(10, ctx.currentTime);
      compressorNode.ratio.setValueAtTime(4, ctx.currentTime);
      compressorNode.attack.setValueAtTime(0.01, ctx.currentTime);
      compressorNode.release.setValueAtTime(0.2, ctx.currentTime);
      compressorNode.connect(ctx.destination);
    }

    if (!musicGainNode) {
      musicGainNode = ctx.createGain();
      musicGainNode.connect(compressorNode);
    }

    // Smooth fade in with loud master volume scaled by currentMusicVolume
    const targetGain = Math.max(0.0001, 0.92 * currentMusicVolume);
    musicGainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    musicGainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.8);

    chordIndex = 0;
    scheduleChillChord(ctx, musicGainNode);
  } catch {
    isMusicPlaying = false;
  }
}


/**
 * Stops chill background music smoothly
 */
export function stopBackgroundMusic() {
  if (!isMusicPlaying) return;
  isMusicPlaying = false;

  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }

  const ctx = getAudioContext();
  if (ctx && musicGainNode) {
    try {
      musicGainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      setTimeout(() => {
        activeMusicNodes.forEach((node) => {
          try {
            (node as OscillatorNode).stop?.();
            node.disconnect();
          } catch {
            // Ignore
          }
        });
        activeMusicNodes = [];
      }, 700);
    } catch {
      // Ignore
    }
  }
}

/**
 * Toggles music playback state
 */
export function setBackgroundMusicEnabled(enabled: boolean) {
  if (enabled) {
    startBackgroundMusic(true);
  } else {
    stopBackgroundMusic();
  }
}
