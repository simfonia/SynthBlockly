# SynthBlockly (Web) 與 SynthBlockly Stage (Processing) 互通規格書

## 1. 專案願景與架構對齊
本規格旨在確保 **Web 版 (SynthBlockly)** 與 **VS Code 擴充功能版 (SynthBlockly Stage)** 之間的 XML 專案檔能夠互相匯入，達成「一份邏輯，兩處運行」的目標。

### 技術平台對照
| 元件 | SynthBlockly (Web) | SynthBlockly Stage (Processing) |
| :--- | :--- | :--- |
| **環境** | Browser / Vite | VS Code Extension / Processing-java |
| **音訊引擎** | Tone.js | Minim (Java Library) |
| **視覺引擎** | p5.js | Processing Core (Java) |
| **產生器** | `Blockly.JavaScript` | `Blockly.Processing` (產生 .pde 檔案) |

---

## 2. 命名規範 (Naming Standards)

### 2.1 積木 ID (Block Type IDs)
為了實現 XML 互通，所有核心積木的 ID 必須完全一致。
- **樂器定義**: `sb_instrument_container`, `sb_master_container`
- **合成器**: `sb_create_synth_instrument`, `sb_create_sampler_instrument`
- **參數控制**: `sb_container_adsr`, `sb_container_volume`, `sb_container_vibrato`
- **演奏**: `sb_play_note`, `sb_play_melody`, `sb_rhythm_sequence`
- **傳輸**: `sb_transport_start_stop`, `sb_transport_set_bpm`, `sb_tone_loop`

### 2.2 變數命名規範 (Generator Variable Naming)
在 Processing (Java) 中，型別是強制的。
- **預設樂器名稱**: 固定為 `DefaultSynth`。
- **音訊 API 預留字**: `audioEngine`, `Tone`, `Minim` 不可用作使用者變數。
- **保留變數**: 
    - `k`: 用於按鍵事件判斷。
    - `mStart`: 用於 Loop 內的小節起始時間。

---

## 3. 音訊 API 對齊 (API Abstraction)
雖然底層庫不同，但積木產出的邏輯應對齊以下抽象介面：

| 功能 | 參數規格 (JSON / String) | 說明 |
| :--- | :--- | :--- |
| **建立合成器** | `(name, type)` | Type 統一為: `Sine`, `Square`, `Triangle`, `Sawtooth`, `FMSynth`, `AMSynth` |
| **建立取樣器** | `(name, map, baseUrl)` | `map` 支援 JSON 格式字串或 URL |
| **音符演奏** | `(note, dur, time, vel)` | `dur` 統一採用 Tone.js 符號 (`4n`, `8n`, `1m`) |
| **ADSR** | `(a, d, s, r)` | 數值範圍統一為 A, D, R (秒), S (0.0-1.0) |

---

## 4. 關鍵功能實作對齊 (待辦事項)
為了達成完全互通，#processing 專案需補齊以下功能：
1.  **String Parser**: 在 Java 端實作能解析 `C4Q, E4.E` 等旋律字串的類別。
2.  **Rhythm Engine**: 實作能解析 `x---x---` 16 格節奏並根據 BPM 換算的排程器。
3.  **Container Context**: 產生器需實作 `getContainerTarget` 邏輯，自動抓取父層容器的 `NAME` 欄位。

---

## 5. 名詞與翻譯對齊 (Glossary)
- **過採樣 (Oversample)**: 統一使用此名詞，而非超取樣。
- **重新採樣 (Resampling)**: 統一使用此名詞，而非重新取樣。
- **頻率倍率 (Frequency Ratio)**: 指諧波或加法合成中的頻率關係。
- **時值 (Duration)**: 指音符長度。
- **帽子積木 (Hat Block)**: 指事件觸發積木（MIDI, Serial, Key）。
