# SabioChess Sound Packs & Audio Architecture

This directory contains all audio assets organized by sound pack and chess move classification.

---

## Directory Structure Convention

All audio assets follow a hierarchical, category-based naming scheme:

```
public/sounds/
├── <pack-name>/
│   ├── <classification>/
│   │   ├── <descriptive-sound-name>.wav / .mp3
│   │   └── ...
```

### Supported Sound Packs
1. **`meme/`** - Viral Meme Vault (Authentic, family-friendly meme audio clips)
2. **`arcade/`** - 8-Bit Arcade Pack (Chiptune, retro coins, power-ups, lasers)
3. **`cartoon/`** - Cartoon Slapstick Pack (Slide whistles, boings, squeaks, anvils)
4. **`classical/`** - Classical Symphony Pack (Grand piano, orchestral bells, harp, timpani)

---

## 1. Meme Vault Sound Directory (`public/sounds/meme/`)

All meme clips are **100% PG / Family-Friendly** (No profanity, swear words, or trademarked brand audio logos).

### Brilliant (`public/sounds/meme/brilliant/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `mlg-airhorn.wav` | MLG Airhorn | Classic MLG 360-noscope triple airhorn |
| `anime-nani.mp3` | Anime "Nani?!" | "Omae Wa Mou Shindeiru... NANI?!" sound bite |
| `anime-wow.mp3` | Anime "Wow!" | Sparkle high-pitch anime wow meme |
| `heavenly-choir.mp3` | Heavenly Angelic Choir | Ascended heavenly choral harmony |

### Great Move (`public/sounds/meme/great/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `let-him-cook.mp3` | "Let Him Cook!" | Iconic hype voice line |
| `gah-dayum.mp3` | "Gah Dayum!" | High-energy comedic reaction clip |
| `celebration-fanfare.mp3` | Celebration Fanfare | Upbeat trumpets & victory horn |
| `victory-fanfare.mp3` | Victory Fanfare | Heroic brass triumph chord |

### Best Move (`public/sounds/meme/best/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `noice-click.wav` | Michael Rosen "Noice" | Famous "*click* Noice" quote |
| `tactical-hitmarker.wav` | Tactical Hitmarker | Crisp audio hitmarker tick |
| `yeah-baby.mp3` | "WOOOOO Yeah Baby!" | Penguinz0 iconic celebration |
| `retro-coin.mp3` | Retro Coin Ding | Crisp classic arcade coin drop |

### Excellent (`public/sounds/meme/excellent/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `emotional-damage.mp3` | "Emotional Damage!" | Steven He legendary voice line |
| `what-da-dog-doin.mp3` | "What Da Dog Doin?!" | Viral internet dog confusion line |
| `star-power.mp3` | Star Power Chime | Sparkling magic star shimmer |

### Good (`public/sounds/meme/good/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `hehe-boi.mp3` | "Hehe Bwoi" | Ainsley Harriott mischievous grin |
| `taco-bell-bong.mp3` | Taco Bell Bong | Ultra resonant iconic gong |
| `bonk.mp3` | Comedic Bonk! | Hollow comedic bonk sound effect |

### Book Move (`public/sounds/meme/book/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `what-the-sigma.mp3` | "What The Sigma?!" | Squidward viral sigma voice line |
| `rizz-synth.mp3` | Rizz Sound Effect | Sinister low synth slide |
| `nerd-emoji.mp3` | Nerd Emoji Sound | High-pitched goofy nerd reaction |
| `bass-drop.mp3` | Phonk Bass Drop | Deep 808 sub bass drop |

### Inaccuracy (`public/sounds/meme/inaccuracy/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `huh-cat.mp3` | Confused "HUH?!" Cat | Viral bewildered cat sound |
| `what-the-hell.mp3` | "Boy What The Hell Boy" | Viral confusion reaction clip |
| `crickets.mp3` | Awkward Crickets | Night cricket chirp silence |
| `dun-dun-dun.mp3` | Dun Dun Dunnn! | Classic dramatic sting |

### Mistake (`public/sounds/meme/mistake/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `bruh.mp3` | Bruh Sound #2 | Deep viral movie "Bruh" vocal |
| `brother-eww.mp3` | "Brother Eww!" | "Brother Eww! What's that?!" meme |
| `boo-womp.mp3` | SpongeBob "Boo-Womp" | Sad deflating cartoon sound |

### Blunder (`public/sounds/meme/blunder/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `vine-boom.mp3` | Vine Boom | Ultra sub-bass 808 explosion |
| `fahhh.mp3` | FAHHH (Real Viral Meme) | Dramatic snore scream sound |
| `dun-dun-dun-shock.mp3` | Dun Dun Dunnn! | Sudden thunderous soap opera hit |
| `wilhelm-scream.mp3` | Wilhelm Scream | Legendary Hollywood scream |
| `get-out.mp3` | "Get Out!" | Angry dramatic ejection voice |
| `metal-pipe.mp3` | Metal Pipe Falling | Reverberating hollow metal pipe clang |

### Miss (`public/sounds/meme/miss/`)
| File | Display Name | Vibe / Trigger |
| :--- | :--- | :--- |
| `roblox-oof.mp3` | Roblox "OOF!" | Classic damage oof voice sound |
| `windows-error.mp3` | System Error Tone | Nostalgic digital alert tone |
| `sad-violin.mp3` | Sad Violin | Melancholy weeping string meme |

---

## 2. 8-Bit Arcade Pack (`public/sounds/arcade/`)

| Classification | File Path | Sound Description | Vibe / Trigger |
| :--- | :--- | :--- | :--- |
| **Brilliant** | `arcade/brilliant/victory-fanfare.wav` | 8-Bit Victory Fanfare | Fast ascending 8-bit arpeggio flourish |
| **Great Move** | `arcade/great/double-coin.wav` | Arcade Double Coin | High double coin pickup |
| **Best Move** | `arcade/best/coin-chime.wav` | 8-Bit Coin Chime | Crisp arcade coin chime |
| **Excellent** | `arcade/excellent/powerup.wav` | 8-Bit Power-Up | 3-note ascending power-up chime |
| **Good** | `arcade/good/blip.wav` | 8-Bit Friendly Blip | Friendly high square wave blip |
| **Book Move** | `arcade/book/stage-clear.wav` | Stage Clear Jingle | Classic melodic 8-bit level sequence |
| **Inaccuracy** | `arcade/inaccuracy/laser-zap.wav` | Laser Zap Down | Downwards pitch frequency laser zap |
| **Mistake** | `arcade/mistake/hit-hurt.wav` | 8-Bit Hit Hurt | Crunchy bit-crush damage sound |
| **Blunder** | `arcade/blunder/explosion.wav` | 8-Bit Explosion | Noise burst + descending pitch descent |
| **Miss** | `arcade/miss/descending-buzz.wav` | Bit-Crush Buzz Drop | Descending low buzz tone |

---

## 3. Cartoon Slapstick Pack (`public/sounds/cartoon/`)

| Classification | File Path | Sound Description | Vibe / Trigger |
| :--- | :--- | :--- | :--- |
| **Brilliant** | `cartoon/brilliant/sparkle-cascade.wav` | Magic Sparkle Cascade | Fairy chime bell cascade |
| **Great Move** | `cartoon/great/spring-boing.wav` | Spring Boing | Vibrato rubber spring boing bounce |
| **Best Move** | `cartoon/best/pop-bell.wav` | Bubble Pop & Bell | High bubble pop + bell ding |
| **Excellent** | `cartoon/excellent/glockenspiel.wav` | Gentle Glockenspiel | Sweet comedic glockenspiel chord |
| **Good** | `cartoon/good/woodblock-knock.wav` | Woodblock Knock | Hollow woodblock knock |
| **Book Move** | `cartoon/book/slide-whistle-up.wav` | Slide Whistle Up | Ascending cartoon slide whistle |
| **Inaccuracy** | `cartoon/inaccuracy/rubber-duck.wav` | Rubber Duck Squeak | Dual-tone squeak toy |
| **Mistake** | `cartoon/mistake/slide-whistle-down.wav` | Slide Whistle Down | Comical slide whistle plunge |
| **Blunder** | `cartoon/blunder/anvil-crash.wav` | Comical Anvil Crash | Heavy metal crash + descending wah |
| **Miss** | `cartoon/miss/sad-trombone.wav` | Sad Wah-Wah Trombone | Classic comedic 4-tone trombone |

---

## 4. Classical Symphony Pack (`public/sounds/classical/`)

| Classification | File Path | Sound Description | Vibe / Trigger |
| :--- | :--- | :--- | :--- |
| **Brilliant** | `classical/brilliant/grand-piano-9th.wav` | Grand Piano Major 9th | Grand piano C-E-G-B-D flourish |
| **Great Move** | `classical/great/orchestral-bell.wav` | Tubular Orchestral Bell | Resonant tubular chime strike |
| **Best Move** | `classical/best/concert-glockenspiel.wav` | Concert Glockenspiel | Bright concert bell chime |
| **Excellent** | `classical/excellent/harp-triad.wav` | Warm Harp Triad | Warm orchestral harp triad |
| **Good** | `classical/good/staccato-cello.wav` | Staccato String Cello | Clean staccato string note |
| **Book Move** | `classical/book/harp-glissando.wav` | Concert Harp Glissando | Concert harp glissando |
| **Inaccuracy** | `classical/inaccuracy/dissonant-pinch.wav` | Dissonant String Pinch | Minor second pizzicato tension |
| **Mistake** | `classical/mistake/cello-minor-plunge.wav` | Cello Minor Plunge | Low cello descending minor phrase |
| **Blunder** | `classical/blunder/timpani-brass-strike.wav` | Timpani Strike & Low Brass | Thunderous timpani + low brass |
| **Miss** | `classical/miss/melancholy-piano.wav` | Melancholy Minor Piano | Solemn minor piano cadence |

---

## Audio Engine Features (`src/app/services/sound.ts`)

- **Dedicated Multi-Pack Pools:** Supports Meme Vault, 8-Bit Arcade, Cartoon Slapstick, Classical Symphony, and Chaos Shuffle.
- **Preloaded Audio Buffers:** Sound buffers across all packs are pre-cached in memory on startup for instant, zero-latency trigger.
- **Anti-Repetition Engine:** Guarantees that the exact same sound will not play twice consecutively within any rotating pool.
- **80ms Smooth Cross-Fade:** Existing audio nodes are cleanly decayed over 80ms using Web Audio API exponential ramps whenever a move is triggered or navigated.
- **Hybrid Procedural Fallback:** If audio files fail to load or offline fallback is needed, Web Audio API synthesis kicks in transparently.
- **Mute & Volume Safety:** Web Audio Context handles gain clamping to prevent clipping.
