const fs = require('fs');
const path = require('path');

const SR = 44100;

/**
 * Clean Studio 44.1kHz 16-Bit Stereo WAV encoder.
 * Linearly normalizes audio to targetPeak with zero clipping distortion.
 */
function encodeNormalizedWAV(samples, sampleRate = 44100, numChannels = 2, targetPeak = 0.8) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  const gain = peak > 0 ? Math.min(1.0, targetPeak / peak) : 1.0;

  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buffer.writeUInt16LE(numChannels * 2, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    if (s > 0.99) s = 0.99;
    else if (s < -0.99) s = -0.99;
    const intVal = Math.round(s * 32767);
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }
  return buffer;
}

function createStereoBuffer(durationSec) {
  return new Float32Array(Math.floor(SR * durationSec * 2));
}

function addSample(buffer, timeSec, left, right = left) {
  const sampleIdx = Math.floor(timeSec * SR);
  const totalSamples = buffer.length / 2;
  if (sampleIdx >= 0 && sampleIdx < totalSamples) {
    buffer[sampleIdx * 2] += left;
    buffer[sampleIdx * 2 + 1] += right;
  }
}

// Micro-fade envelope to prevent any click/pop on note boundaries
function applyMicroEnvelope(val, idx, total, attackLen = 176, releaseLen = 352) {
  let env = 1.0;
  if (idx < attackLen) env = idx / attackLen;
  else if (idx > total - releaseLen) env = Math.max(0, (total - idx) / releaseLen);
  return val * env;
}

// Pure smooth square wave synthesis with bandlimited harmonics
function synthSquare(buffer, startSec, freq, durationSec, vol = 0.3) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  const dPhase = (2 * Math.PI * freq) / SR;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.exp(-norm * 4.0); // smooth exponential decay
    // 3 harmonics for warm retro tone without aliasing
    const wave = Math.sin(phase) + 0.33 * Math.sin(3 * phase) + 0.15 * Math.sin(5 * phase);
    phase += dPhase;
    const sample = applyMicroEnvelope(wave * 0.5 * vol * env, i, total, 80, 200);
    addSample(buffer, t, sample);
  }
}

// Pure smooth sine chime with exponential decay
function synthChime(buffer, startSec, freq, durationSec, vol = 0.3) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  const dPhase = (2 * Math.PI * freq) / SR;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.exp(-norm * 3.5);
    const wave = Math.sin(phase);
    phase += dPhase;
    const sample = applyMicroEnvelope(wave * vol * env, i, total, 100, 300);
    addSample(buffer, t, sample);
  }
}

// Smooth pitch slide (triangle / sine wave)
function synthSlide(buffer, startSec, freqStart, freqEnd, durationSec, vol = 0.3, isTriangle = true) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const currentFreq = freqStart + (freqEnd - freqStart) * norm;
    phase += (2 * Math.PI * currentFreq) / SR;
    const env = Math.exp(-norm * 2.5);
    const wave = isTriangle
      ? (Math.sin(phase) + 0.15 * Math.sin(3 * phase)) * 0.8
      : Math.sin(phase);
    const sample = applyMicroEnvelope(wave * vol * env, i, total, 120, 300);
    addSample(buffer, t, sample);
  }
}

// Deep sub boom
function synthSubBoom(buffer, startSec, startFreq, endFreq, durationSec, vol = 0.4) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const currentFreq = startFreq * Math.exp(-norm * 2.5) + endFreq;
    phase += (2 * Math.PI * currentFreq) / SR;
    const env = Math.exp(-norm * 3.0);
    const wave = Math.sin(phase);
    const sample = applyMicroEnvelope(wave * vol * env, i, total, 100, 350);
    addSample(buffer, t, sample);
  }
}

// Wood click
function synthWoodClick(buffer, startSec, startFreq, endFreq, durationSec, vol = 0.3) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const currentFreq = startFreq * Math.exp(-norm * 6.0) + endFreq;
    phase += (2 * Math.PI * currentFreq) / SR;
    const env = Math.exp(-norm * 8.0);
    const wave = Math.sin(phase);
    const sample = applyMicroEnvelope(wave * vol * env, i, total, 40, 150);
    addSample(buffer, t, sample);
  }
}

function saveTrack(folder, category, filename, buffer) {
  const dir = path.join(__dirname, '..', 'public', 'sounds', folder, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const wavData = encodeNormalizedWAV(buffer, SR, 2, 0.8);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, wavData);
  console.log(`Cleanly Mastered: sounds/${folder}/${category}/${filename}`);
}

// ---------------------------------------------------------
// 1. ARCADE SOUND PACK (Smooth 8-Bit Chiptune)
// ---------------------------------------------------------
function generateArcadePack() {
  // Brilliant: Ascending victory fanfare
  {
    const buf = createStereoBuffer(1.0);
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      synthSquare(buf, idx * 0.05, freq, 0.08, 0.25);
    });
    synthSquare(buf, 0.35, 2093.0, 0.35, 0.3);
    saveTrack('arcade', 'brilliant', 'victory-fanfare.wav', buf);
  }

  // Great: Arcade double coin
  {
    const buf = createStereoBuffer(0.6);
    synthSquare(buf, 0, 987.77, 0.07, 0.28);
    synthSquare(buf, 0.07, 1318.51, 0.3, 0.32);
    saveTrack('arcade', 'great', 'double-coin.wav', buf);
  }

  // Best: Coin chime
  {
    const buf = createStereoBuffer(0.5);
    synthSquare(buf, 0, 1046.5, 0.06, 0.28);
    synthSquare(buf, 0.06, 1567.98, 0.25, 0.32);
    saveTrack('arcade', 'best', 'coin-chime.wav', buf);
  }

  // Excellent: 8-bit powerup
  {
    const buf = createStereoBuffer(0.6);
    synthSquare(buf, 0, 659.25, 0.06, 0.25);
    synthSquare(buf, 0.06, 880.0, 0.06, 0.28);
    synthSquare(buf, 0.12, 1174.66, 0.28, 0.3);
    saveTrack('arcade', 'excellent', 'powerup.wav', buf);
  }

  // Good: Friendly retro blip
  {
    const buf = createStereoBuffer(0.4);
    synthSquare(buf, 0, 783.99, 0.05, 0.25);
    synthSquare(buf, 0.05, 1046.5, 0.15, 0.28);
    saveTrack('arcade', 'good', 'blip.wav', buf);
  }

  // Book: Stage clear retro jingle
  {
    const buf = createStereoBuffer(0.7);
    [440.0, 554.37, 659.25, 880.0].forEach((freq, idx) => {
      synthSquare(buf, idx * 0.07, freq, 0.12, 0.26);
    });
    saveTrack('arcade', 'book', 'stage-clear.wav', buf);
  }

  // Inaccuracy: Laser zap sweep down
  {
    const buf = createStereoBuffer(0.5);
    synthSlide(buf, 0, 880, 220, 0.16, 0.3, true);
    saveTrack('arcade', 'inaccuracy', 'laser-zap.wav', buf);
  }

  // Mistake: 8-bit hit / hurt
  {
    const buf = createStereoBuffer(0.5);
    synthSquare(buf, 0, 220.0, 0.09, 0.3);
    synthSquare(buf, 0.08, 146.83, 0.22, 0.28);
    saveTrack('arcade', 'mistake', 'hit-hurt.wav', buf);
  }

  // Blunder: 8-bit explosion slide & sub boom
  {
    const buf = createStereoBuffer(0.8);
    synthSlide(buf, 0, 350, 50, 0.35, 0.32, true);
    synthSubBoom(buf, 0, 140, 30, 0.45, 0.35);
    saveTrack('arcade', 'blunder', 'explosion.wav', buf);
  }

  // Miss: Descending buzz drop
  {
    const buf = createStereoBuffer(0.6);
    synthSlide(buf, 0, 440, 110, 0.32, 0.3, true);
    saveTrack('arcade', 'miss', 'descending-buzz.wav', buf);
  }
}

// ---------------------------------------------------------
// 2. CARTOON SLAPSTICK PACK (Ultra Smooth Slapstick)
// ---------------------------------------------------------
function generateCartoonPack() {
  // Brilliant: Magic sparkle cascade glissando
  {
    const buf = createStereoBuffer(0.9);
    synthSlide(buf, 0, 523.25, 1567.98, 0.25, 0.25, true);
    synthChime(buf, 0.15, 1760.0, 0.4, 0.28);
    synthChime(buf, 0.25, 2093.0, 0.5, 0.3);
    saveTrack('cartoon', 'brilliant', 'sparkle-cascade.wav', buf);
  }

  // Great: Spring boing bounce
  {
    const buf = createStereoBuffer(0.6);
    synthSlide(buf, 0, 220, 780, 0.15, 0.3, true);
    synthSlide(buf, 0.12, 580, 980, 0.2, 0.26, true);
    saveTrack('cartoon', 'great', 'spring-boing.wav', buf);
  }

  // Best: Bubble pop & bell ding
  {
    const buf = createStereoBuffer(0.6);
    synthWoodClick(buf, 0, 600, 150, 0.035, 0.28);
    synthChime(buf, 0.03, 1760.0, 0.4, 0.3);
    saveTrack('cartoon', 'best', 'pop-bell.wav', buf);
  }

  // Excellent: Gentle glockenspiel chord
  {
    const buf = createStereoBuffer(0.7);
    synthChime(buf, 0, 1046.5, 0.4, 0.26);
    synthChime(buf, 0.08, 1318.51, 0.45, 0.28);
    saveTrack('cartoon', 'excellent', 'glockenspiel.wav', buf);
  }

  // Good: Woodblock knock
  {
    const buf = createStereoBuffer(0.4);
    synthWoodClick(buf, 0, 600, 180, 0.04, 0.28);
    synthWoodClick(buf, 0.02, 750, 200, 0.05, 0.22);
    saveTrack('cartoon', 'good', 'woodblock-knock.wav', buf);
  }

  // Book: Slide whistle up
  {
    const buf = createStereoBuffer(0.7);
    synthSlide(buf, 0, 450, 1400, 0.35, 0.28, true);
    synthChime(buf, 0.32, 1760.0, 0.3, 0.25);
    saveTrack('cartoon', 'book', 'slide-whistle-up.wav', buf);
  }

  // Inaccuracy: Rubber duck squeak
  {
    const buf = createStereoBuffer(0.5);
    synthSlide(buf, 0, 850, 1500, 0.1, 0.26, true);
    synthSlide(buf, 0.1, 1500, 800, 0.12, 0.26, true);
    saveTrack('cartoon', 'inaccuracy', 'rubber-duck.wav', buf);
  }

  // Mistake: Slide whistle plunge down
  {
    const buf = createStereoBuffer(0.7);
    synthSlide(buf, 0, 1150, 280, 0.45, 0.3, true);
    saveTrack('cartoon', 'mistake', 'slide-whistle-down.wav', buf);
  }

  // Blunder: Comedic anvil thud + wah slide
  {
    const buf = createStereoBuffer(0.8);
    synthSubBoom(buf, 0, 180, 40, 0.5, 0.35);
    synthSlide(buf, 0.1, 350, 120, 0.4, 0.28, true);
    saveTrack('cartoon', 'blunder', 'anvil-crash.wav', buf);
  }

  // Miss: Sad trombone 4-tone wah-wah
  {
    const buf = createStereoBuffer(1.4);
    [415.3, 392.0, 369.99, 349.23].forEach((freq, idx) => {
      const start = idx * 0.22;
      const dur = idx === 3 ? 0.45 : 0.18;
      synthSlide(buf, start, freq, freq - (idx === 3 ? 25 : 5), dur, 0.26, true);
    });
    saveTrack('cartoon', 'miss', 'sad-trombone.wav', buf);
  }
}

// ---------------------------------------------------------
// 3. CLASSICAL SYMPHONY PACK (Pristine Orchestral Harmony)
// ---------------------------------------------------------
function generateClassicalPack() {
  // Brilliant: Grand piano Major 9th chord
  {
    const buf = createStereoBuffer(1.6);
    [261.63, 329.63, 392.0, 493.88, 587.33, 1046.5].forEach((freq, idx) => {
      synthChime(buf, idx * 0.025, freq, 1.2, 0.24);
    });
    saveTrack('classical', 'brilliant', 'grand-piano-9th.wav', buf);
  }

  // Great: Tubular orchestral bell
  {
    const buf = createStereoBuffer(1.5);
    synthChime(buf, 0, 523.25, 1.2, 0.3);
    synthChime(buf, 0.02, 783.99, 1.0, 0.24);
    saveTrack('classical', 'great', 'orchestral-bell.wav', buf);
  }

  // Best: Concert glockenspiel
  {
    const buf = createStereoBuffer(1.2);
    synthChime(buf, 0, 880.0, 0.8, 0.28);
    synthChime(buf, 0.06, 1318.51, 0.9, 0.26);
    saveTrack('classical', 'best', 'concert-glockenspiel.wav', buf);
  }

  // Excellent: Warm harp triad
  {
    const buf = createStereoBuffer(1.2);
    [392.0, 493.88, 587.33, 783.99].forEach((freq, idx) => {
      synthChime(buf, idx * 0.035, freq, 0.9, 0.25);
    });
    saveTrack('classical', 'excellent', 'harp-triad.wav', buf);
  }

  // Good: Staccato string / cello note
  {
    const buf = createStereoBuffer(0.5);
    synthChime(buf, 0, 392.0, 0.3, 0.26);
    synthChime(buf, 0, 784.0, 0.22, 0.16);
    saveTrack('classical', 'good', 'staccato-cello.wav', buf);
  }

  // Book: Concert harp glissando
  {
    const buf = createStereoBuffer(1.2);
    [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
      synthChime(buf, idx * 0.03, freq, 0.75, 0.2);
    });
    saveTrack('classical', 'book', 'harp-glissando.wav', buf);
  }

  // Inaccuracy: Dissonant string pinch
  {
    const buf = createStereoBuffer(0.7);
    synthChime(buf, 0, 440.0, 0.45, 0.24);
    synthChime(buf, 0.015, 466.16, 0.45, 0.24);
    saveTrack('classical', 'inaccuracy', 'dissonant-pinch.wav', buf);
  }

  // Mistake: Cello minor plunge
  {
    const buf = createStereoBuffer(0.8);
    synthSlide(buf, 0, 220.0, 196.0, 0.2, 0.25, false);
    synthSlide(buf, 0.18, 196.0, 164.81, 0.35, 0.26, false);
    saveTrack('classical', 'mistake', 'cello-minor-plunge.wav', buf);
  }

  // Blunder: Timpani strike & low brass resonance
  {
    const buf = createStereoBuffer(1.2);
    synthSubBoom(buf, 0, 75, 30, 0.9, 0.35);
    synthChime(buf, 0.03, 146.83, 0.7, 0.22);
    synthChime(buf, 0.03, 174.61, 0.7, 0.22);
    saveTrack('classical', 'blunder', 'timpani-brass-strike.wav', buf);
  }

  // Miss: Melancholy minor chord
  {
    const buf = createStereoBuffer(1.4);
    [220.0, 261.63, 329.63].forEach((freq, idx) => {
      synthChime(buf, idx * 0.03, freq, 1.1, 0.24);
    });
    saveTrack('classical', 'miss', 'melancholy-piano.wav', buf);
  }
}

generateArcadePack();
generateCartoonPack();
generateClassicalPack();
console.log('Zero-distortion pristine audio sound packs successfully generated!');
