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
    - [x] 支援多個效果器疊加 (透過 `addEffectToChain` 與 `forceRebuildHatEffects`)。
    - [x] 修復線性流程與事件驅動流程的效果器相容性。
- [x] **自訂取樣器**:可以用自訂的wav檔創建樂器音色
- [x] **實現 ADSR 包絡的視覺化**
- [x] **日誌系統多語系化與區塊化**
- [x] **音效播放 (SFX) 積木實作**
- [x] **優化演奏旋律清單積木 (Melody List Block Optimization)**: 更新 Tooltip 加入休止符 (R) 用法說明，並連結至專屬說明文件 (HelpUrl)。
- [x] **效果器參數優化與 Tremolo 實作**: 為 `sb_setup_effect` 新增 Tremolo 效果器，並優化動態介面。
- [x] **修復全域 HelpUrl 路徑**: 確保所有積木的說明連結皆支援 Vite 的 `BASE_URL` 動態路徑。
- [x] **修正 `sb_set_adsr` 與音源控制邏輯**: 解決 `DefaultSynth` 名稱衝突，並補全音量、顫音積木的動態選單與系統音源支援。
- [x] **教材範例優化**: 完成 01-08 範例的註解與邏輯修復，特別是 Bossa Nova 步進音序器的重構。
- [x] **音序器引擎增強**: 支援複雜和弦符號、視覺分隔符（空格/|）並解決時序警告問題。
- [x] **UI/UX 進階優化**: 實作帽子積木新外觀與 ADSR 點選即時同步功能。
- [x] **修復 Shadow Block 複製塌陷問題**: 透過防抖與強制重繪機制解決。
- [x] **修復刪除積木自動捲動問題**: 透過非同步事件處理 (Debounce) 優化。
- [x] **範例清單排序與標題優化**: 實作自然排序與自動序號顯示。
- [x] **整合說明文件入口網頁**: 實作自動掃描 `public/docs/` 功能與 Toolbar Help 按鈕。
- [x] **序列埠與效果器穩定化**: 
    - 補齊語系檔缺失 (`LOG_SERIAL_OPENED` 等)。
    - 修復 `updateFilter` 缺失與 LDR 數值映射。
    - 新增 `sb_console_log` 積木輔助除錯。

## 待辦事項 (Future V2.0)
- [ ] **目標音源效果器 (Targeted Effects)**: 為 `sb_setup_effect` 增加「指定目標音源 (Target Instrument)」參數，實現分軌混音。
- [ ] **動態效果器管理**: 提供 `sb_clear_effects` 或類似機制，讓使用者能更精確控制效果器的生命週期。
- [ ] **和弦清單擴充**: 讓 `sb_play_melody` 直接支援解析和弦名稱字串。
- [ ] **自訂波形進階功能**: 實作從數學表示式定義波形。
