# SynthBlockly - 視覺化音樂合成器

SynthBlockly 是一個基於 Blockly 視覺化程式設計的音樂合成器，它結合了 p5.js 進行即時波形視覺化，並利用 Tone.js 驅動音訊引擎。使用者可以透過積木組合來創作音樂、控制合成器參數，並與外部 MIDI 鍵盤或 Arduino 等序列裝置互動。

## 專案特色

*   **Blockly 視覺化編程**：透過拖曳積木，輕鬆創作音樂邏輯。
*   **Tone.js 音訊引擎**：強大的 Web Audio API 框架，實現高品質的聲音合成。
*   **p5.js 即時波形視覺化**：動態顯示聲音波形，讓音樂可見。
*   **Web MIDI 支援**：連接您的 MIDI 裝置，直接與合成器互動。
*   **Web Serial 支援**：與 Arduino 等序列裝置連線，實現硬體控制音樂。

## 本機執行

1.  **複製 repo**：
    ```bash
    git clone https://github.com/simfonia/SynthBlockly.git
    cd SynthBlockly
    ```
2.  **開啟 `index.html`**：
    直接用瀏覽器打開 `docs/index.html`。
    
    推薦使用支援 Web MIDI 和 Web Serial 的瀏覽器 (例如 Google Chrome)。

## 雲端執行

您可以透過以下網址直接存取：
[https://simfonia.github.io/SynthBlockly/](https://simfonia.github.io/SynthBlockly/)


## 開發資訊

*   **Blockly 版本**：v12.3.1
*   **Tone.js 版本**：v14.8.39
*   **p5.js 版本**：v1.6.0

## 許可證

本專案使用 [MIT 許可證](https://opensource.org/licenses/MIT)。

Copyright (c) 2025 simfonia