# 2026-01-15 工作日誌 (SynthBlockly) - UI 視覺化擴展

## 異動摘要
- **介面重構**：將 `adsrContainer` 的寬度減半，並新增 `spectrumContainer` 並列顯示。
- **新增頻譜視覺化**：
    - 建立 `js/ui/spectrumVisualizer.js`，實作即時頻譜圖 (FFT) 繪製。
    - 頻譜圖採用 HSL 顏色映射，根據頻率強度呈現藍、紫、紅的漸層色。
- **音訊引擎擴充**：
    - 在 `js/core/audioEngine.js` 中新增 `fftAnalyser` (Tone.fft)。
    - 重新串接分析器鏈結：`Source -> Waveform -> FFT -> Destination`。
- **ADSR 視覺優化**：
    - 為了適應寬度減半的版面，將 ADSR 標籤 (A, D, S, R) 的字體縮小至 10px。
    - 將標籤顯示閾值從 15px 降至 8px，確保在短時值設定下標籤仍能顯示。

## 影響檔案
- `index.html`: 新增視覺化容器結構。
- `styles.css`: 設定並列佈局樣式。
- `js/app.js`: 初始化頻譜視覺化模組。
- `js/core/audioEngine.js`: 新增 FFT 分析器並串接訊號。
- `js/ui/adsrVisualizer.js`: 優化窄版面下的標籤顯示。
- `js/ui/spectrumVisualizer.js` (New): 頻譜圖繪製邏輯。

## 技術細節
- FFT 解析度設定為 64 (bins)，以配合窄版面並呈現類似復古合成器的數位風格。
- 頻譜高度映射範圍設定為 -100dB 至 0dB。
