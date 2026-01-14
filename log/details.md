# SynthBlockly 技術細節 (踩過的坑)

### 1. ADSR 視覺化比例問題 (2026-01-14)
- **問題**：原本為了美觀強制每個階段 (A, D, S, R) 佔用最小寬度，導致 `A=0` 時仍有斜線，且光點動畫與時間感不符。
- **解決方案**：移除 `minVisualWidth`，改採線性時間映射。定義 `totalTime = A + D + R + 0.5s (Sustain)`。
- **注意**：在 Canvas 繪製時，若階段寬度為 0，`lineTo` 會產生垂直線，這在視覺上是正確的「瞬間起音/釋放」。

### 2. 全域熱鍵衝突 (2026-01-14)
- **細節**：在實作 `Esc` 熱鍵時，必須使用 `event.preventDefault()`，否則在某些瀏覽器中 `Esc` 可能會觸發「停止頁面載入」或其他原生行為。
- **實作位置**：統一在 `js/ui/buttons.js` 的全域監聽器中處理，以確保與 Blockly 的事件循環不衝突。

### 3. Sampler 積木註冊位置 (2026-01-14)
- **注意**：`sb_create_sampler_instrument` 的定義不在 `instruments_blocks.js`，而是在獨立的 `sampler_blocks.js` 中，修改顏色時需注意檔案路徑。
- **技術點**：該積木使用了 `Mutator` 處理自訂 URL 欄位的顯示/隱藏，顏色修改需在 `samplerBlock` 常數物件中進行。
