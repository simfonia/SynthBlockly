# 技術細節 2026-01-16

## 1. 巢狀 Shadow Block 與複製 Bug
*   **問題**：複製包含音序器的迴圈積木時，內部的「來源」和「小節」影子積木消失。
*   **嘗試方案**：
    1. 移除 `init` 中的手動 `setShadowDom`，改用 Toolbox XML 定義。 -> **無效**。
    2. 下拉選單改回 `FieldTextInput` 以減少渲染負擔。 -> **無效**。
    3. 加入 `try-catch` 防止 `getBlocksByType` 報錯。 -> **無效**。
*   **結論**：這是 Blockly 核心在處理 Deep Copy 與 Shadow Block 狀態恢復時的佈局計算錯誤。目前的臨時對策是拖入一個新積木再拉開，即可強制重新渲染。

## 2. 刪除積木觸發全域捲動 (Scroll to Top)
*   **現象**：刪除任一積木後，頁面捲動到最上方，且有時第一個積木會被選取。
*   **排查**：
    1. 懷疑 `onWorkspaceChanged` 的 `updateADSR` 觸發 DOM 重繪。 -> 隔離後 **無效**。
    2. 懷疑 `javascriptGenerator.init` 導致 Workspace 狀態重置。 -> 在 DELETE 事件中跳過 init，**無效**。
    3. 實作 Scroll Restoration Hack (記錄座標並 setTimeout 還原)。 -> 能取消選取，但擋不住瀏覽器層級的 Scroll 跳動。
*   **潛在因素**：可能是 `#blocklyDiv` 父容器的 Flexbox `height: 100vh` 配合 `flex-grow: 1`，在 SVG 大小變動時觸發了瀏覽器的「捲動錨定 (Scroll Anchoring)」異常。

## 3. 音序器與全域樂器衝突 (解決方案)
*   **坑點**：背景音序器與 PC 鍵盤即興共用 `currentInstrumentName`。
*   **修正**：在 `audioEngine.playRhythmSequence` 內部，於 `for` 迴圈排程前，先解析並鎖定 `targetInstr`。
*   **實作**：
    ```javascript
    const targetInstr = this.instruments[soundSource] || this.instruments[this.currentInstrumentName] || synth;
    // ... 在排程中使用 targetInstr ...
    ```
    這確保了背景伴奏在排程那一刻起，就不再受到後續 `currentInstrumentName` 切換的影響。