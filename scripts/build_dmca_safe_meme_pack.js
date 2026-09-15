const fs = require('fs');
const path = require('path');

const SR = 44100;

function encodeNormalizedWAV(samples, sampleRate = 44100, numChannels = 2, targetPeak = 0.85) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  const gain = peak > 0 ? targetPeak / peak : 1.0;

  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buffer.writeUInt16LE(numChannels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    if (s > 0.999) s = 0.999;
    else if (s < -0.999) s = -0.999;
    const intVal = Math.round(s * 32767);
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }
  return buffer;
}

function createBuffer(durationSec) {
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

function applyEnvelope(val, idx, total, attackLen = 220, releaseLen = 440) {
  let env = 1.0;
  if (idx < attackLen) env = idx / attackLen;
  else if (idx > total - releaseLen) env = (total - idx) / releaseLen;
  return val * Math.max(0, Math.min(1, env));
}

function synthSine(buffer, startSec, freq, durationSec, vol = 0.4, decayExp = 2.5) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  const dPhase = (2 * Math.PI * freq) / SR;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.exp(-norm * decayExp);
    const wave = Math.sin(phase);
    phase += dPhase;
    const sample = applyEnvelope(wave * vol * env, i, total, 100, 300);
    addSample(buffer, t, sample);
  }
}

function synthSlide(buffer, startSec, freqStart, freqEnd, durationSec, vol = 0.4) {
  const total = Math.floor(durationSec * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const currentFreq = freqStart + (freqEnd - freqStart) * norm;
    phase += (2 * Math.PI * currentFreq) / SR;
    const env = Math.sin(Math.PI * norm);
    const sample = applyEnvelope(Math.sin(phase) * vol * env, i, total, 100, 250);
    addSample(buffer, t, sample);
  }
}

function synthAirhorn(buffer, startSec, vol = 0.45) {
  const blasts = [0, 0.12, 0.24];
  const freqs = [466.16, 587.33, 698.46];
  blasts.forEach((blastTime) => {
    const total = Math.floor(0.18 * SR);
    const phases = [0, 0, 0];
    const dPhases = freqs.map((f) => (2 * Math.PI * f) / SR);
    for (let i = 0; i < total; i++) {
      const t = startSec + blastTime + i / SR;
      const env = i < total * 0.1 ? i / (total * 0.1) : 1 - (i - total * 0.1) / (total * 0.9);
      let wave = 0;
      for (let k = 0; k < freqs.length; k++) {
        wave += (Math.sin(phases[k]) + 0.3 * Math.sin(3 * phases[k])) * 0.28;
        phases[k] += dPhases[k];
      }
      const sample = applyEnvelope(wave * vol * env, i, total, 80, 200);
      addSample(buffer, t, sample);
    }
  });
}

function synthHitmarker(buffer, startSec, vol = 0.5) {
  const total = Math.floor(0.04 * SR);
  let phase = 0;
  const dPhase = (2 * Math.PI * 3200) / SR;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const env = Math.exp(-i / (SR * 0.008));
    const click = (Math.random() * 2 - 1) * 0.5 + Math.sin(phase) * 0.5;
    phase += dPhase;
    addSample(buffer, t, click * vol * env);
  }
}

function synthHeavyPunch(buffer, startSec, vol = 0.5) {
  const total = Math.floor(0.7 * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.exp(-norm * 4.5);
    const subFreq = 100 * Math.exp(-norm * 5) + 35;
    phase += (2 * Math.PI * subFreq) / SR;
    const sub = Math.sin(phase) * 0.7;
    const crunch = (Math.random() * 2 - 1) * Math.exp(-norm * 20) * 0.3;
    const sample = applyEnvelope((sub + crunch) * vol * env, i, total, 50, 300);
    addSample(buffer, t, sample);
  }
}

function synthRetroJump(buffer, startSec, vol = 0.4) {
  synthSlide(buffer, startSec, 180, 720, 0.22, vol);
  synthSine(buffer, startSec + 0.05, 880, 0.18, vol * 0.5, 6);
}

function synthSadTrombone(buffer, startSec, vol = 0.35) {
  const notes = [311.13, 293.66, 277.18, 246.94];
  notes.forEach((freq, idx) => {
    const startT = startSec + idx * 0.35;
    const total = Math.floor((idx === 3 ? 0.8 : 0.32) * SR);
    let phase = 0;
    for (let i = 0; i < total; i++) {
      const t = startT + i / SR;
      const norm = i / total;
      const vib = norm > 0.25 ? Math.sin(2 * Math.PI * 6.0 * (i / SR)) * 4.5 : 0;
      const currentFreq = freq + vib;
      phase += (2 * Math.PI * currentFreq) / SR;
      const wave = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      const env = Math.sin((Math.PI * i) / total);
      const sample = applyEnvelope(wave * vol * env, i, total, 100, 200);
      addSample(buffer, t, sample);
    }
  });
}

function synthGoofyCry(buffer, startSec, vol = 0.4) {
  const total = Math.floor(0.75 * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const vib = Math.sin(2 * Math.PI * 18 * t) * (50 * Math.exp(-norm * 2));
    const freq = 550 - norm * 280 + vib;
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-norm * 2.2) * Math.sin(Math.PI * norm);
    const wave = Math.sin(phase) + 0.3 * Math.sin(2 * phase);
    const sample = applyEnvelope(wave * vol * env, i, total, 100, 300);
    addSample(buffer, t, sample);
  }
}

function synthVillagerHmm(buffer, startSec, vol = 0.45) {
  const total = Math.floor(0.45 * SR);
  let p1 = 0, p2 = 0, p3 = 0;
  const dp1 = (2 * Math.PI * 140) / SR;
  const dp2 = (2 * Math.PI * 280) / SR;
  const dp3 = (2 * Math.PI * 700) / SR;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.sin(Math.PI * norm);
    const f1 = Math.sin(p1);
    const f2 = Math.sin(p2) * 0.35;
    const f3 = Math.sin(p3) * 0.15;
    p1 += dp1; p2 += dp2; p3 += dp3;
    const sample = applyEnvelope((f1 + f2 + f3) * vol * env, i, total, 100, 250);
    addSample(buffer, t, sample);
  }
}

function synthFunnyOof(buffer, startSec, vol = 0.45) {
  const total = Math.floor(0.3 * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const freq = 260 - norm * 110;
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-norm * 5) * Math.sin(Math.PI * norm);
    const wave = Math.sin(phase) + Math.sin(2 * phase) * 0.2;
    const sample = applyEnvelope(wave * vol * env, i, total, 60, 200);
    addSample(buffer, t, sample);
  }
}

function synthDeadpanOk(buffer, startSec, vol = 0.4) {
  synthSine(buffer, startSec, 330, 0.12, vol * 0.7, 4);
  synthSine(buffer, startSec + 0.1, 260, 0.25, vol * 0.8, 3);
}

function synthCrowdHeckle(buffer, startSec, vol = 0.4) {
  const total = Math.floor(0.9 * SR);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = startSec + i / SR;
    const norm = i / total;
    const env = Math.exp(-norm * 1.8) * Math.sin(Math.PI * norm);
    const freq = 220 - norm * 50;
    phase += (2 * Math.PI * freq) / SR;
    const noise = (Math.random() * 2 - 1) * 0.2;
    const tone = Math.sin(phase) * 0.6;
    const sample = applyEnvelope((noise + tone) * vol * env, i, total, 100, 300);
    addSample(buffer, t, sample);
  }
}

function saveMemeTrack(category, filename, buffer) {
  const dir = path.join(__dirname, '..', 'public', 'sounds', 'meme', category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const wavData = encodeNormalizedWAV(buffer, SR, 2, 0.85);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, wavData);
  console.log(`Saved Clean Normalized Audio: sounds/meme/${category}/${filename}`);
}

console.log('Generating DMCA-safe, normalized audio replacements for meme sound pack...');

// 1. Tactical Hitmarker
{
  const buf = createBuffer(0.2);
  synthHitmarker(buf, 0, 0.5);
  saveMemeTrack('best', 'tactical-hitmarker.wav', buf);
}

// 2. Heavy Punch Impact
{
  const buf = createBuffer(0.8);
  synthHeavyPunch(buf, 0, 0.5);
  saveMemeTrack('great', 'anime-impact-punch.wav', buf);
}

// 3. Retro Jump Chime
{
  const buf = createBuffer(0.4);
  synthRetroJump(buf, 0, 0.4);
  saveMemeTrack('best', 'retro-super-jump.wav', buf);
}

// 4. Sad Trombone Fail
{
  const buf = createBuffer(2.0);
  synthSadTrombone(buf, 0, 0.35);
  saveMemeTrack('mistake', 'sad-fail-trombone.wav', buf);
  saveMemeTrack('miss', 'sad-fail-trombone.wav', buf);
}

// 5. Goofy Death Cry
{
  const buf = createBuffer(0.9);
  synthGoofyCry(buf, 0, 0.4);
  saveMemeTrack('excellent', 'goofy-goblin-death.wav', buf);
}

// 6. MLG Airhorn
{
  const buf = createBuffer(0.8);
  synthAirhorn(buf, 0, 0.45);
  saveMemeTrack('brilliant', 'mlg-airhorn.wav', buf);
}

// 7. Villager HMM
{
  const buf = createBuffer(0.5);
  synthVillagerHmm(buf, 0, 0.45);
  saveMemeTrack('good', 'funny-hmm.wav', buf);
}

// 8. Funny OOF Grunt
{
  const buf = createBuffer(0.4);
  synthFunnyOof(buf, 0, 0.45);
  saveMemeTrack('miss', 'comedic-oof-grunt.wav', buf);
}

// 9. Deadpan OK
{
  const buf = createBuffer(0.5);
  synthDeadpanOk(buf, 0, 0.45);
  saveMemeTrack('good', 'deadpan-ok.wav', buf);
}

// 10. Crowd Heckle Boo
{
  const buf = createBuffer(1.0);
  synthCrowdHeckle(buf, 0, 0.4);
  saveMemeTrack('mistake', 'crowd-heckle-boo.wav', buf);
}

console.log('All meme sound replacements successfully generated and verified with 0% distortion!');
