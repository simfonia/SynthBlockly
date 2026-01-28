# SynthBlockly (V2.1)

一個基於 Blockly、Tone.js 與 p5.js 的現代化視覺化音樂創作平台。

**🚀 立即體驗：[https://simfonia.github.io/SynthBlockly/](https://simfonia.github.io/SynthBlockly/)**

---

## 🌟 專案特色

### 1. 核心架構 V2.1 (Container-Based)
- **樂器容器化**：採用「定義樂器」與「總輸出控制」容器，確保系統初始化與執行順序正確。
- **異步產碼**：支援 `async/await` 編曲邏輯，實現精準的長篇樂曲播放與等待機制。
- **瞬間預約系統**：演奏積木支援瞬間預約模式，達成多軌道（如鋼琴與小提琴）的完美同步。

### 2. 強大的音訊引擎
- **多重採樣 (Multisampling)**：內建高品質鋼琴音源，涵蓋 A1-A7 全音域，解決高低音失真問題。
- **自訂取樣器**：支援透過 JSON 映射表建立專屬樂器，並支援直接從 URL 載入配置檔。
- **專業效果器鏈**：包含失真 (Distortion)、濾波器 (Filter)、混響 (Reverb) 等多種效果，支援局部與全域掛載。
- **高階編曲工具**：支援 16 格步進音序器、複雜和弦名稱解析、延音 (`-`) 與三連音符號。

### 3. 硬體與互動整合
- **即時事件驅動**：透過「帽子積木」即時響應 MIDI 設備與 Arduino (Serial) 訊號，無需點擊執行即可互動。
- **PC 鍵盤演奏**：將電腦鍵盤轉化為即興演奏工具，支援 ADSR 即時預覽。
- **雙視覺化系統**：整合即時示波器 (Oscilloscope) 與 ADSR 包絡線圖表。

---

## 🛠️ 開發與建置

本專案使用 **Vite** 作為前端建置工具。

### 環境需求
- Node.js (建議 v18 以上)
- NPM

### 快速開始
1. **安裝依賴**
   ```bash
   npm install
   ```
2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
3. **正式建置**
   ```bash
   npm run build
   ```

---

## 📂 檔案結構簡介
- `js/core/`: 包含音訊引擎、各類 Service 與 Blockly 核心邏輯。
- `js/blocks/`: 積木定義與產生器 (JavaScript)。
- `public/samples/`: 音訊取樣資源庫。
- `public/docs/`: 積木使用說明文件 (中英雙語)。
- `src/examples/`: 內建範例專案庫 (XML)。

---

## 🎵 音訊取樣來源 (Audio Samples)
本專案使用的取樣資源來自以下開源專案與社群：

- **Piano**: 引用自 [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
- **Jazz Kit (TR-909)**: 引用自 [fluid-music/tr-909](https://www.npmjs.com/package/@fluid-music/tr-909)
- **Violin**: 引用自 Freesound 使用者 sgossner 之取樣包：
  - [Violin Section Pizzicato](https://freesound.org/people/sgossner/packs/21062/)
  - [Violin Section Vibrato Sustain](https://freesound.org/people/sgossner/packs/21060/)

---

## 📄 授權說明
本專案採 MIT 授權。音訊取樣資源之詳細授權請參考各來源網頁。
