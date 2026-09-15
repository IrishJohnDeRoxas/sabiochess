#!/usr/bin/env python3
import math
import struct
import wave
import os
import random

SAMPLE_RATE = 44100

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Clip and convert to 16-bit signed integers
        raw_data = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            val = int(clamped * 32767.0)
            raw_data.extend(struct.pack('<h', val))
        wav_file.writeframes(raw_data)

# --- SOUND GENERATORS ---

def gen_vine_boom():
    # Massive 808 sub bass drop + noise punch + saturation
    duration = 1.2
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Frequency exponential drop from 110Hz to 28Hz
        freq = 110.0 * math.exp(-t * 2.8) + 28.0
        phase = 2 * math.pi * freq * t
        sub = math.sin(phase) + 0.35 * math.sin(phase * 2) + 0.15 * math.sin(phase * 3)
        # Add transient noise click
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 35.0) * 0.6
        # Saturation / soft clipping
        raw = (sub + noise) * math.exp(-t * 2.2) * 1.6
        saturated = math.tanh(raw)
        samples.append(saturated * 0.95)
    return samples

def gen_fahhh():
    # Comedic buzz-saw snore / groaning scream
    duration = 0.95
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        base_freq = 95.0 + 35.0 * math.sin(2 * math.pi * 5.0 * t)
        # Buzz wave with formants
        saw = 0.0
        for h in range(1, 12):
            saw += (1.0 / h) * math.sin(2 * math.pi * base_freq * h * t)
        # Rasp noise
        rasp = (random.random() * 2.0 - 1.0) * 0.25
        # Envelope: swell then sustain then drop
        env = math.sin(math.pi * min(1.0, t / duration)) ** 1.5
        samples.append(math.tanh((saw * 0.5 + rasp) * env * 1.5) * 0.85)
    return samples

def gen_metal_pipe():
    # Resonant metallic dissonant clatter
    duration = 1.3
    n = int(duration * SAMPLE_RATE)
    partials = [(540, 1.0, 3.2), (830, 0.8, 3.5), (1240, 0.7, 4.0), (1680, 0.6, 4.5), (2300, 0.5, 5.0), (3400, 0.4, 6.0)]
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for freq, amp, decay in partials:
            wobble = 1.0 + 0.04 * math.sin(2 * math.pi * 12.0 * t)
            val += amp * math.sin(2 * math.pi * freq * wobble * t) * math.exp(-t * decay)
        # Transient clang noise
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 40.0) * 0.8
        samples.append(math.tanh((val * 0.5 + noise) * 1.4) * 0.9)
    return samples

def gen_emotional_damage():
    # Dramatic cinematic orchestral hit
    duration = 0.9
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Brass fifths chord: D2, A2, D3, F3, A3
        hit = (
            0.6 * math.sin(2 * math.pi * 73.42 * t) +
            0.5 * math.sin(2 * math.pi * 110.0 * t) +
            0.5 * math.sin(2 * math.pi * 146.83 * t) +
            0.4 * math.sin(2 * math.pi * 174.61 * t) +
            0.3 * math.sin(2 * math.pi * 220.0 * t)
        )
        crash = (random.random() * 2.0 - 1.0) * math.exp(-t * 7.0) * 0.5
        env = math.exp(-t * 3.5)
        samples.append(math.tanh((hit * 0.8 + crash) * env * 1.5) * 0.9)
    return samples

def gen_windows_error():
    # Iconic critical stop chord (F#4 + C#5 + F#5)
    duration = 0.6
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        chord = (
            math.sin(2 * math.pi * 369.99 * t) +
            math.sin(2 * math.pi * 554.37 * t) +
            0.8 * math.sin(2 * math.pi * 739.99 * t)
        )
        square = 0.3 * (1.0 if chord > 0 else -1.0)
        env = math.exp(-t * 4.0)
        samples.append((chord * 0.35 + square) * env * 0.8)
    return samples

def gen_anime_wow():
    # Playful bright ascending anime chirp / sparkle
    duration = 0.75
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Rising glissando from 520Hz to 1040Hz with vibrato
        f = 520.0 + 520.0 * (t / duration) ** 1.3 + 25.0 * math.sin(2 * math.pi * 14.0 * t)
        sine = math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * f * 2 * t)
        sparkle = 0.25 * math.sin(2 * math.pi * 2093.0 * t) * math.exp(-((t - 0.4) * 8)**2)
        env = math.sin(math.pi * (t / duration)) ** 0.8
        samples.append((sine * 0.6 + sparkle) * env * 0.85)
    return samples

def gen_ultra_instinct():
    # Heavenly epic choral chord swell + high bell
    duration = 1.3
    n = int(duration * SAMPLE_RATE)
    samples = []
    notes = [220.0, 277.18, 329.63, 415.30, 493.88]
    for i in range(n):
        t = i / SAMPLE_RATE
        chord = 0.0
        for idx, freq in enumerate(notes):
            vib = 1.0 + 0.015 * math.sin(2 * math.pi * (5.5 + idx * 0.3) * t)
            chord += math.sin(2 * math.pi * freq * vib * t)
        bell = 0.5 * math.sin(2 * math.pi * 1760.0 * t) * math.exp(-t * 3.0)
        env = math.sin(math.pi * min(1.0, t / duration)) ** 0.7
        samples.append((chord * 0.18 + bell) * env * 0.9)
    return samples

def gen_mlg_airhorn():
    # Staccato triplet horn blast (B4, B4, B4, sustained E5)
    duration = 0.85
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        if t < 0.12:
            freq = 493.88
            gate = 1.0 if (t % 0.12) < 0.09 else 0.0
        elif t < 0.24:
            freq = 493.88
            gate = 1.0 if ((t - 0.12) % 0.12) < 0.09 else 0.0
        elif t < 0.36:
            freq = 493.88
            gate = 1.0 if ((t - 0.24) % 0.12) < 0.09 else 0.0
        else:
            freq = 659.25
            gate = math.exp(-(t - 0.36) * 3.0)
        horn = (
            math.sin(2 * math.pi * freq * t) +
            0.7 * math.sin(2 * math.pi * freq * 2 * t) +
            0.5 * math.sin(2 * math.pi * freq * 3 * t) +
            0.3 * math.sin(2 * math.pi * freq * 4 * t)
        )
        samples.append(math.tanh(horn * 0.5 * gate * 1.5) * 0.85)
    return samples

def gen_galaxy_brain():
    # Ethereal crystal harmonic chime arpeggio
    duration = 1.1
    n = int(duration * SAMPLE_RATE)
    chimes = [(0.0, 1046.5), (0.1, 1318.5), (0.2, 1567.98), (0.3, 2093.0), (0.45, 2637.0)]
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for start_t, f in chimes:
            if t >= start_t:
                dt = t - start_t
                val += math.sin(2 * math.pi * f * dt) * math.exp(-dt * 4.5)
        samples.append(val * 0.35)
    return samples

def gen_sheesh():
    # Upward high soaring vocal pitch whistle glide
    duration = 0.7
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 400.0 + 900.0 * (t / duration) ** 2.0
        vib = 1.0 + 0.04 * math.sin(2 * math.pi * 16.0 * t)
        whistle = math.sin(2 * math.pi * freq * vib * t) + 0.25 * math.sin(2 * math.pi * freq * 2 * vib * t)
        env = math.sin(math.pi * (t / duration)) ** 1.2
        samples.append(whistle * env * 0.8)
    return samples

def gen_cash_register():
    # Mechanical click + double high resonant silver bell ring
    duration = 0.8
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        click = (random.random() * 2.0 - 1.0) * math.exp(-t * 60.0) * 0.5
        bell1 = math.sin(2 * math.pi * 2093.0 * t) * math.exp(-t * 5.0) if t > 0.04 else 0.0
        bell2 = math.sin(2 * math.pi * 2637.0 * t) * math.exp(-(t - 0.08) * 4.0) if t > 0.08 else 0.0
        samples.append((click + bell1 * 0.4 + bell2 * 0.4) * 0.85)
    return samples

def gen_siuuu():
    # Deep booming chant shout swell
    duration = 0.9
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 140.0 - 40.0 * (t / duration)
        vocal = math.sin(2 * math.pi * freq * t) + 0.5 * math.sin(2 * math.pi * freq * 2 * t)
        crowd = (random.random() * 2.0 - 1.0) * 0.25 * math.sin(math.pi * (t / duration))
        env = math.sin(math.pi * (t / duration)) ** 0.8
        samples.append(math.tanh((vocal * 0.6 + crowd) * env * 1.5) * 0.85)
    return samples

def gen_level_up():
    # Pentatonic crystal chime sequence
    duration = 0.7
    n = int(duration * SAMPLE_RATE)
    notes = [(0.0, 587.33), (0.08, 739.99), (0.16, 880.0), (0.24, 1174.66), (0.34, 1479.98)]
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for start_t, f in notes:
            if t >= start_t:
                dt = t - start_t
                val += math.sin(2 * math.pi * f * dt) * math.exp(-dt * 6.0)
        samples.append(val * 0.4)
    return samples

def gen_gigachad_phonk():
    # Distorted phonk 808 cowbell melody + heavy sub hit
    duration = 0.85
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        cb_f = 587.33 if t < 0.25 else 783.99
        cb = math.sin(2 * math.pi * cb_f * t) + 0.6 * math.sin(2 * math.pi * cb_f * 1.5 * t)
        sub = math.sin(2 * math.pi * 55.0 * t) * math.exp(-t * 3.0)
        env = math.exp(-((t % 0.25) * 7.0))
        samples.append(math.tanh((cb * env + sub * 0.8) * 1.5) * 0.85)
    return samples

def gen_calculated_ding():
    # 200 IQ pristine glass bell ping with echo
    duration = 0.95
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 1760.0
        bell = math.sin(2 * math.pi * f * t) * math.exp(-t * 3.8)
        echo = 0.35 * math.sin(2 * math.pi * f * (t - 0.25)) * math.exp(-(t - 0.25) * 4.0) if t > 0.25 else 0.0
        samples.append((bell + echo) * 0.5)
    return samples

def gen_minecraft_xp():
    # Classic rising square-wave ding
    duration = 0.4
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 880.0 + 880.0 * (t / duration)
        sq = 1.0 if math.sin(2 * math.pi * f * t) > 0 else -1.0
        env = 1.0 - (t / duration)
        samples.append(sq * env * 0.25)
    return samples

def gen_golden_bell():
    # Deep orchestral church / tubular bell strike
    duration = 1.2
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 440.0
        bell = (
            math.sin(2 * math.pi * f * t) * math.exp(-t * 2.5) +
            0.5 * math.sin(2 * math.pi * f * 2.76 * t) * math.exp(-t * 3.5) +
            0.25 * math.sin(2 * math.pi * f * 5.4 * t) * math.exp(-t * 5.0)
        )
        samples.append(bell * 0.4)
    return samples

def gen_discord_ping():
    # D5 to G5 gentle chime ping
    duration = 0.65
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        tone1 = math.sin(2 * math.pi * 587.33 * t) * math.exp(-t * 6.0)
        tone2 = math.sin(2 * math.pi * 783.99 * (t - 0.12)) * math.exp(-(t - 0.12) * 5.0) if t > 0.12 else 0.0
        samples.append((tone1 + tone2) * 0.45)
    return samples

def gen_record_scratch():
    # Filtered noisy vinyl friction turntable stop
    duration = 0.45
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        noise = random.random() * 2.0 - 1.0
        freq = max(100.0, 1200.0 - 2400.0 * (t / duration))
        tone = math.sin(2 * math.pi * freq * t)
        env = math.sin(math.pi * (t / duration))
        samples.append((noise * 0.5 + tone * 0.5) * env * 0.7)
    return samples

def gen_squeak_toy():
    # Rubber duck dual squeeze chirp
    duration = 0.4
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        if t < 0.2:
            f = 2200.0 - 600.0 * (t / 0.2)
        else:
            f = 1600.0 + 800.0 * ((t - 0.2) / 0.2)
        sq = math.sin(2 * math.pi * f * t)
        env = math.sin(math.pi * (t / duration))
        samples.append(sq * env * 0.6)
    return samples

def gen_suspense_thud():
    # Dark low cinematic suspense impact with reverb tail
    duration = 0.8
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        thud = math.sin(2 * math.pi * 65.0 * t) * math.exp(-t * 4.0)
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 8.0) * 0.3
        samples.append((thud + noise) * 0.75)
    return samples

def gen_bruh():
    # Low-pitched downward vocal formant drop
    duration = 0.5
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 220.0 - 90.0 * (t / duration)
        vocal = math.sin(2 * math.pi * freq * t) + 0.6 * math.sin(2 * math.pi * freq * 2 * t) + 0.3 * math.sin(2 * math.pi * freq * 3 * t)
        env = math.sin(math.pi * (t / duration)) ** 1.3
        samples.append(math.tanh(vocal * env * 1.5) * 0.85)
    return samples

def gen_sad_trombone():
    # Wah-wah-wah-waaaah comedy motif
    duration = 1.3
    n = int(duration * SAMPLE_RATE)
    notes = [(0.0, 0.28, 293.66), (0.28, 0.28, 277.18), (0.56, 0.28, 261.63), (0.84, 0.46, 246.94)]
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for start_t, dur, f in notes:
            if start_t <= t < start_t + dur:
                dt = t - start_t
                bend = f - (15.0 * (dt / dur) if start_t > 0.8 else 0.0)
                vib = 1.0 + 0.03 * math.sin(2 * math.pi * 9.0 * dt)
                saw = math.sin(2 * math.pi * bend * vib * dt) + 0.4 * math.sin(2 * math.pi * bend * 2 * vib * dt)
                env = math.sin(math.pi * (dt / dur)) ** 0.9
                val = saw * env
        samples.append(val * 0.6)
    return samples

def gen_cartoon_slide():
    # Smooth plunging downward slide whistle
    duration = 0.65
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 1200.0 - 800.0 * (t / duration) ** 0.8
        vib = 1.0 + 0.04 * math.sin(2 * math.pi * 18.0 * t)
        whistle = math.sin(2 * math.pi * freq * vib * t)
        env = math.sin(math.pi * (t / duration)) ** 0.8
        samples.append(whistle * env * 0.75)
    return samples

def gen_prowler_horn():
    # Spider-Man 2099 / Prowler dissonant industrial horn screech
    duration = 0.95
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        sub = math.sin(2 * math.pi * 65.0 * t)
        screech = math.sin(2 * math.pi * 195.0 * t) + 0.8 * math.sin(2 * math.pi * 410.0 * t)
        noise = (random.random() * 2.0 - 1.0) * 0.2
        env = math.exp(-t * 2.2)
        samples.append(math.tanh((sub * 0.8 + screech * 0.6 + noise) * env * 2.0) * 0.9)
    return samples

def gen_coffin_dance():
    # Minor key synth bounce arpeggio lead motif
    duration = 0.9
    n = int(duration * SAMPLE_RATE)
    notes = [
        (0.00, 0.12, 392.00), # G4
        (0.12, 0.12, 392.00), # G4
        (0.24, 0.12, 587.33), # D5
        (0.36, 0.12, 523.25), # C5
        (0.48, 0.12, 466.16), # Bb4
        (0.60, 0.12, 440.00), # A4
        (0.72, 0.18, 392.00), # G4
    ]
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        val = 0.0
        for start_t, dur, f in notes:
            if start_t <= t < start_t + dur:
                dt = t - start_t
                lead = math.sin(2 * math.pi * f * dt) + 0.3 * math.sin(2 * math.pi * f * 2 * dt)
                env = math.exp(-dt * 8.0)
                val = lead * env
        samples.append(val * 0.5)
    return samples

def gen_punch_bam():
    # Heavy slap transient + punch thud
    duration = 0.45
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        slap = (random.random() * 2.0 - 1.0) * math.exp(-t * 45.0) * 0.8
        thud = math.sin(2 * math.pi * 90.0 * math.exp(-t * 10.0) * t) * math.exp(-t * 6.0)
        samples.append(math.tanh((slap + thud * 1.2) * 1.3) * 0.85)
    return samples

def gen_roblox_oof():
    # Short vocal pitch drop pop
    duration = 0.35
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 280.0 - 80.0 * (t / duration)
        vocal = math.sin(2 * math.pi * freq * t) + 0.4 * math.sin(2 * math.pi * freq * 2 * t)
        env = math.sin(math.pi * (t / duration)) ** 1.5
        samples.append(vocal * env * 0.8)
    return samples


SOUNDS_MAP = {
    # Brilliant Pool
    'public/sounds/meme/brilliant_1.wav': gen_anime_wow,
    'public/sounds/meme/brilliant_2.wav': gen_ultra_instinct,
    'public/sounds/meme/brilliant_3.wav': gen_mlg_airhorn,
    'public/sounds/meme/brilliant_4.wav': gen_galaxy_brain,
    'public/sounds/meme/brilliant.wav': gen_anime_wow,

    # Great / Best Pool
    'public/sounds/meme/great_1.wav': gen_sheesh,
    'public/sounds/meme/great_2.wav': gen_cash_register,
    'public/sounds/meme/great_3.wav': gen_siuuu,
    'public/sounds/meme/great_4.wav': gen_level_up,
    'public/sounds/meme/great.wav': gen_sheesh,

    'public/sounds/meme/best_1.wav': gen_level_up,
    'public/sounds/meme/best_2.wav': gen_cash_register,
    'public/sounds/meme/best_3.wav': gen_sheesh,
    'public/sounds/meme/best_4.wav': gen_siuuu,
    'public/sounds/meme/best.wav': gen_level_up,

    'public/sounds/meme/excellent_1.wav': gen_level_up,
    'public/sounds/meme/excellent_2.wav': gen_calculated_ding,
    'public/sounds/meme/excellent.wav': gen_level_up,

    'public/sounds/meme/good_1.wav': gen_punch_bam,
    'public/sounds/meme/good_2.wav': gen_roblox_oof,
    'public/sounds/meme/good.wav': gen_punch_bam,

    # Book Move Pool
    'public/sounds/meme/book_1.wav': gen_gigachad_phonk,
    'public/sounds/meme/book_2.wav': gen_calculated_ding,
    'public/sounds/meme/book_3.wav': gen_minecraft_xp,
    'public/sounds/meme/book_4.wav': gen_golden_bell,
    'public/sounds/meme/book.wav': gen_gigachad_phonk,

    # Inaccuracy Pool
    'public/sounds/meme/inaccuracy_1.wav': gen_discord_ping,
    'public/sounds/meme/inaccuracy_2.wav': gen_record_scratch,
    'public/sounds/meme/inaccuracy_3.wav': gen_squeak_toy,
    'public/sounds/meme/inaccuracy_4.wav': gen_suspense_thud,
    'public/sounds/meme/inaccuracy.wav': gen_discord_ping,

    # Mistake Pool
    'public/sounds/meme/mistake_1.wav': gen_bruh,
    'public/sounds/meme/mistake_2.wav': gen_sad_trombone,
    'public/sounds/meme/mistake_3.wav': gen_cartoon_slide,
    'public/sounds/meme/mistake_4.wav': gen_prowler_horn,
    'public/sounds/meme/mistake.wav': gen_bruh,

    # Blunder Pool
    'public/sounds/meme/blunder_1.wav': gen_vine_boom,
    'public/sounds/meme/blunder_2.wav': gen_fahhh,
    'public/sounds/meme/blunder_3.wav': gen_metal_pipe,
    'public/sounds/meme/blunder_4.wav': gen_emotional_damage,
    'public/sounds/meme/blunder_5.wav': gen_windows_error,
    'public/sounds/meme/blunder.wav': gen_vine_boom,

    # Miss Pool
    'public/sounds/meme/miss_1.wav': gen_coffin_dance,
    'public/sounds/meme/miss_2.wav': gen_punch_bam,
    'public/sounds/meme/miss_3.wav': gen_roblox_oof,
    'public/sounds/meme/miss.wav': gen_coffin_dance,

    # Legacy Pack Aliases (classic_*, chaos_*) for full backwards compatibility
    'public/sounds/meme/classic_brilliant.wav': gen_anime_wow,
    'public/sounds/meme/classic_great.wav': gen_sheesh,
    'public/sounds/meme/classic_best.wav': gen_level_up,
    'public/sounds/meme/classic_excellent.wav': gen_level_up,
    'public/sounds/meme/classic_good.wav': gen_punch_bam,
    'public/sounds/meme/classic_book.wav': gen_calculated_ding,
    'public/sounds/meme/classic_inaccuracy.wav': gen_discord_ping,
    'public/sounds/meme/classic_mistake.wav': gen_windows_error,
    'public/sounds/meme/classic_blunder.wav': gen_vine_boom,
    'public/sounds/meme/classic_miss.wav': gen_sad_trombone,

    'public/sounds/meme/chaos_brilliant.wav': gen_prowler_horn,
    'public/sounds/meme/chaos_great.wav': gen_punch_bam,
    'public/sounds/meme/chaos_best.wav': gen_galaxy_brain,
    'public/sounds/meme/chaos_excellent.wav': gen_gigachad_phonk,
    'public/sounds/meme/chaos_good.wav': gen_punch_bam,
    'public/sounds/meme/chaos_book.wav': gen_gigachad_phonk,
    'public/sounds/meme/chaos_inaccuracy.wav': gen_discord_ping,
    'public/sounds/meme/chaos_mistake.wav': gen_metal_pipe,
    'public/sounds/meme/chaos_blunder.wav': gen_fahhh,
    'public/sounds/meme/chaos_miss.wav': gen_emotional_damage,
}

def main():
    print(f"Generating {len(SOUNDS_MAP)} meme sound WAV files...")
    for filepath, generator in SOUNDS_MAP.items():
        samples = generator()
        write_wav(filepath, samples)
    print("All sound files successfully generated!")

if __name__ == '__main__':
    main()
