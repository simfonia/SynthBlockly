# SynthBlockly專案任務說明

## 概述
    - 本專案是一個透過 Blockly 連結 Arduino/MIDI 鍵盤 到 p5.js+ tone.js 來產生音樂的合成器
    - 本專案為由 **Vite** 驅動的現代 JavaScript 模組化專案。

    - 開發環境
        * Windows 11
        * VS Code v1.106.2
        * node.js v24.12.0
        * Blockly v12.3.1
        * tone.js
        * p5.js



## 事件驅動機制 (Event-Driven Mechanism)

專案保留並優化了事件驅動架構，以處理「帽子積木」(例如「當收到...」)，使其**無需點擊「執行」按鈕**即可即時響應。

其運作流程已整合到模組化架構中：

1. **監聽器註冊**: `blocklyManager.js` 在初始化時，會監聽工作區的變化 (`workspace.addChangeListener`)。
2. **動態綁定**: 當使用者拖放一個「帽子積木」到工作區時，`blocklyManager.js` 會：
    a. 擷取該積木內部的程式碼。
    b. 將程式碼動態生成一個可執行的函式。
    c. 透過 `eventManager.js` 將此函式註冊到對應的事件系統中（如 `midiEngine` 或 `serialEngine`）。
3. **動態註銷**: 當積木被刪除時，`blocklyManager.js` 會通知 `eventManager.js` 註銷對應的監聽器，以釋放資源。

---

## 任務清單
- [x] **專案遷移至 Vite**: 將整個專案從傳統 script 引入方式重構為使用 Vite 進行建置與開發。
- [x] **程式碼模組化**: 根據新規範將所有 JavaScript 程式碼拆分為獨立的 ES 模組，存放於 `js/core`, `js/ui`, `js/blocks` 等資料夾中。
- [x] **重構事件處理架構**：將 `sb_serial_data_received` 和 `sb_midi_note_received` 兩個帽子積木重構為即時事件驅動模式。
- [x] **實現多樂器管理**:
    - [x] 新增 `sb_create_synth_instrument` 積木，用於創建 FMSynth, AMSynth 等不同類型的樂器。
    - [x] 新增 `sb_select_current_instrument` 積木，用於在不同樂器之間切換。
    - [x] 優化 `sb_set_adsr` 積木，使其能夠正確地對當前所選樂器套用 ADSR 設定。
- [x] **實現即時樂器參數控制**:
    - [x] 新增 `sb_set_instrument_vibrato` (抖音) 積木。
    - [x] 新增 `sb_set_instrument_volume` (音量) 積木。
- [x] **修復 MIDI 與 PC 鍵盤發聲問題**: 解決了模組化後的 MIDI 監聽器作用域問題。
- [x] **解決 Blockly API 棄用警告**: 為相關的變數操作 API 增加了 polyfill。
- [x] **完成基礎積木庫與分類**: 補齊標準積木，並建立 `SynthBlockly` 主分類。
- [x] **實作自訂波形樂器積木 (Custom Waveform Instrument Blocks)**
    * [x] **積木一：「加法合成器 (諧波)」(Harmonic Additive Synthesizer)**
        - [x] 設計 Blockly 積木定義 (JSON/JS) - 可擴展列表，每個項目輸入「泛音 N 振幅」。
        - [x] 實作 Tone.js 邏輯，使用 `oscillator.partials`。
        - [x] 整合 ADSR 參數調整。(通過 `sb_set_adsr` 積木作用於當前樂器實現)
    * [x] **積木二：「加法合成器 (自由頻率)」(Free Frequency Additive Synthesizer)**
        - [x] 設計 Blockly 積木定義 (JSON/JS) - 可擴展列表，每個項目輸入「振幅 (Amplitude)」和「頻率 (Frequency)」。
        - [x] 實作 Tone.js 邏輯，使用多個 `Tone.Oscillator` 和 `Tone.Gain` 混合。
        - [x] 整合 ADSR 參數調整。

- [x] **動態效果器管理與效果鏈重構 (Dynamic Effect Management and Chain Refactoring)**
- [x] **自訂取樣器**:可以用自訂的wav檔創建樂器音色
- [ ] **實現 ADSR 包絡的視覺化**