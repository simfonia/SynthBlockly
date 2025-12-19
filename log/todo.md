# SynthBlockly-Vite 專案文件

本文件記錄 SynthBlockly (Vite 版本) 的程式架構與開發任務。

---

## 程式架構說明 (Architecture Overview)

本專案已從傳統的全域腳本模式，全面重構為由 **Vite** 驅動的現代 JavaScript 模組化專案。

### 主要組成 (Main Components)

- **`main.js` (根目錄)**: 專案的 **Vite 主入口點**。其核心職責是匯入並執行 `js/app.js`，從而啟動整個應用程式。
- **`js/app.js`**: **應用程式的核心指揮中心**。負責初始化 Blockly 工作區、音訊引擎、MIDI/Serial 引擎以及所有 UI 元件，並協調各模組之間的運作。
- **`js/core/`**: 存放核心商業邏輯的模組。
    - `audioEngine.js`: 封裝 **Tone.js**，管理所有音訊合成、樂器、效果器與播放。
    - `blocklyManager.js`: 管理 Blockly 工作區的生命週期、事件監聽與動態積木註冊。
    - `midiEngine.js` / `serialEngine.js`: 分別處理 **Web MIDI** 與 **Web Serial** API 的通訊。
- **`js/blocks/`**: 存放所有 Blockly 自訂積木的相關檔案。
    - `index.js`: 統一載入並註冊所有積木定義、程式碼生成器與語言檔案。
    - `*_blocks.js`: 各類積木的 JSON 定義。
    - `*_generators.js`: 各類積木對應的 JavaScript 程式碼生成器。
- **`toolbox.xml` (根目錄)**: 定義 Blockly 工具箱的結構與內容。

### 事件驅動機制 (Event-Driven Mechanism)

專案保留並優化了事件驅動架構，以處理「帽子積木」(例如「當收到...」)，使其**無需點擊「執行」按鈕**即可即時響應。

其運作流程已整合到模組化架構中：

1. **監聽器註冊**: `blocklyManager.js` 在初始化時，會監聽工作區的變化 (`workspace.addChangeListener`)。
2. **動態綁定**: 當使用者拖放一個「帽子積木」到工作區時，`blocklyManager.js` 會：
    a. 擷取該積木內部的程式碼。
    b. 將程式碼動態生成一個可執行的函式。
    c. 透過 `eventManager.js` 將此函式註冊到對應的事件系統中（如 `midiEngine` 或 `serialEngine`）。
3. **動態註銷**: 當積木被刪除時，`blocklyManager.js` 會通知 `eventManager.js` 註銷對應的監聽器，以釋放資源。

---

## 近期任務與狀態 (Recent Tasks & Status)

### 已完成 (Completed)
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

### 待辦事項 (Next Steps / ToDo)

此處為專案接下來的開發任務，繼承自舊版的規劃。

- [ ] **音源 (Synth) 積木擴充**
    - [ ] `設定合成器波形`：提供下拉選單選擇 `sine`, `square`, `triangle`, `sawtooth`，並能動態加入自訂波形。
    - [ ] `設定濾波器 (Filter)`：可調整類型 (lowpass/highpass)、截止頻率、共振(Q)。
- [ ] **效果器 (Effects) 積木擴充**
    - [ ] `設定 殘響 (Reverb)`：可調整乾濕比、衰退時間。
    - [ ] `設定 延遲 (Delay)`：可調整延遲時間、回饋、乾濕比。
- [ ] **演奏 (Actions) 積木擴充**
    - [ ] `休息 [時值]`：提供音符時值的靜音等待。
    - [ ] **(優化)** 將 `播放 音符` 積木的音高和時值輸入改為更友善的介面（如鋼琴鍵、下拉選單）。
- [ ] **進階自訂波形功能開發**
    - [ ] **方法一：諧波疊加器 (Harmonic Adder)**
        - [ ] 建立 `定義自訂波形 [名稱]` 帽子積木。
        - [ ] 建立 `加入諧波 [序號] 振幅 [大小]` 堆疊積木。
    - [ ] **方法二：數學表示式 (Math Expression)**
        - [ ] 建立 `從表示式定義波形 f(x) = [___]` 積木。
        - [ ] 在積木的 Tooltip 中清楚說明變數 `x` 的意義。
