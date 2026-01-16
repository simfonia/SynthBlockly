# 任務交接 2026-01-16

## 當前進度
1.  **步進音序器 (Step Sequencer) 升級**：
    - 已實作「使用和弦名稱?」功能。當勾選時，序列中的代號（如 `C7`）會查找 `audioEngine.chords` 並播放整組和弦。
    - 小節數參數改為 Value Input，支援變數 `i` 等動態數值。
    - 來源選擇支援動態樂器清單（自動掃描工作區積木）。
2.  **音訊引擎鎖定機制**：
    - 修改了 `audioEngine.js` 中的 `playRhythmSequence`，使其在排程時閉包捕獲當下的 `targetInstrument`。這解決了背景伴奏會因為全域切換 `currentInstrumentName` 而被切換音色的衝突。
3.  **ADSR 設定增強**：
    - `sb_set_adsr` 增加目標選擇，預設為「全部」，也可針對單一自訂音源設定。
4.  **系統優化**：
    - 加入全域 Master Limiter (-1dB)。
    - XML 存檔改為 Pretty Print 格式。
    - 範例 `13_12-bar blues.xml` 已更新為多軌（Lead, Bass, Chord, Drum）示範。

## 下一步工作建議
1.  **繼續排查 UI Bug**：
    - **影子積木變形**：在複製包含音序器的迴圈時，內部的影子積木有時會塌陷消失。懷疑是巢狀 Shadow Block 在複製過程中的渲染競態條件。
    - **刪除積木自動捲動**：刪除積木時頁面會跳回頂端。已確認與 JS 監聽器無直接關聯，可能是 CSS Flexbox 排版或 Blockly 核心在 `onBlockDelete` 時的焦點行為。
2.  **Sidechain Compression**：若要進一步解決混音平衡問題，可考慮實作 Sidechain 積木。

## 關鍵技術細節（踩過的坑）
- **積木 Shadow DOM 設定**：手動在 `init` 中 `setShadowDom` 會導致複製積木時發生 XML 解析衝突。目前雖然已移除大部分手動設定，但複製問題依舊，建議未來研究 Blockly 官方對於動態影子積木的標準處理流程。
- **音序器時序鎖定**：Tone.js 的立即執行 (`triggerAttackRelease` 帶時間參數) 在大批量排程時，必須在排程當下就決定好 `Instrument` 實例，否則發聲時會去抓最新的全域狀態，導致多軌音色混亂。
- **多語系 Shadow Tooltip**：Shadow Block 的 `tooltip` 使用 `%{BKY_...}` 有時失效，改用 `setTooltip(function() { return Blockly.Msg[...] })` 是最穩健的動態解法。
