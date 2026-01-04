# SynthBlockly - 視覺化音樂合成器

SynthBlockly 是一個基於 Blockly 視覺化程式設計的音樂合成器，它結合了 p5.js 進行即時波形視覺化，並利用 Tone.js 驅動音訊引擎。使用者可以透過積木組合來創作音樂、控制合成器參數，並與外部 MIDI 鍵盤或 Arduino 等序列裝置互動。

## 專案特色

*   **Blockly 視覺化編程**：透過拖曳積木，輕鬆創作音樂邏輯。
*   **強大音訊引擎**：基於 Tone.js，支援 PolySynth、AM/FM 合成、取樣器 (Sampler) 及加法合成。
*   **全域移調系統**：支援即時半音調整與八度位移，同步作用於 MIDI、電腦鍵盤與積木演奏。
*   **軟硬體深度整合**：
    *   **Web MIDI**：連接 MIDI 裝置，支援和弦映射。
    *   **Web Serial**：與 Arduino 互動，支援 Bitmask 高效傳輸協議 (例如 4x4 觸控板)。
*   **動態資源載入**：音效檔與範例專案支援動態掃描載入，無需手動更新清單。
*   **專業視覺化**：整合即時示波器與 ADSR 包絡線動態預覽。

## 本機開發與執行

本專案使用 Vite 作為建置工具，請確保您已安裝 [Node.js](https://nodejs.org/)。

1.  **安裝依賴**：
    ```bash
    npm install
    ```
2.  **啟動開發伺服器**：
    ```bash
    npm run dev
    ```
3.  **編譯正式版本**：
    ```bash
    npm run build
    ```

推薦使用支援 Web MIDI 和 Web Serial 的瀏覽器 (例如 Google Chrome)。

## 範例專案擴充規範

您可以透過在 `src/examples` 目錄下新增檔案來擴充範例清單。

*   **軟體範例**：直接放置 `.xml` 檔案至 `src/examples/`。
*   **硬體範例**：建立資料夾 (如 `MyProject/`)，包含：
    *   `MyProject.xml` (或 `main.xml`): 積木主程式。
    *   `*.ino`: Arduino 程式碼 (自動偵測)。
    *   `*.md`: 操作說明 (自動顯示於硬體指引視窗)。

## 開發資訊

*   **核心框架**：Blockly, Tone.js, p5.js
*   **建置工具**：Vite
*   **主要開發語言**：JavaScript (ES6+)

## 許可證

本專案使用 [MIT 許可證](https://opensource.org/licenses/MIT)。

Copyright (c) 2025-2026 simfonia