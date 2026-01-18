# 技術細節 2026-01-16

## 1. 巢狀 Shadow Block 與複製 Bug
*   **問題**：複製包含音序器的迴圈積木時，內部的「來源」和「小節」影子積木消失。
*   **嘗試方案**：
    1. 移除 `init` 中的手動 `setShadowDom`，改用 Toolbox XML 定義。 -> **無效**。
    2. 下拉選單改回 `FieldTextInput` 以減少渲染負擔。 -> **無效**。
    3. 加入 `try-catch` 防止 `getBlocksByType`報錯。 -> **無效**。
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

---

# 技術細節 2026-01-18

## 1. 非同步積木產生與執行 (Async/Await)
*   **現象**：在函式內使用「播放並等待」報錯 `await is only valid in async functions`。
*   **成因**：Blockly 預設產生的 Procedure 是普通 Function。即便手動覆寫產生器，Blockly 載入插件後有時會將其覆蓋。
*   **解法**：在 `blocklyManager.js` 的 `getBlocksCode` 中，於產生代碼的前一刻，再次強制執行 `applyAsyncProcedureOverrides`。
*   **執行環境**：必須使用 `new AsyncFunction(code)` (或自定義 `AsyncFunction` 建構子) 並配合 `await runner()` 來執行，否則主程式會瞬發結束，不等待旋律播完。

## 2. 音序器符號解析 (Regex Jitter)
*   **問題**：`Dm7` 或 `Cmin_aug` 無法發聲。
*   **成因**：舊的正則表達式 `/([A-G][#b]?\d+|[xX]|[.\-])/g` 要求音符後必接數字，且不含底線。
*   **修正**：改用 `/([A-Za-z0-9#b_]+|[xX]|[.\-])/g` 並配合 `trim()` 與空格過濾。這確保了複雜和弦與視覺分隔符 (`|`) 共存時的穩定性。

## 3. 時序警告 (Events scheduled inside scheduled callbacks)
*   **現象**：Tone.js 警告 `should use the passed in scheduling time`。
*   **成因**：在 `Transport.Loop` 中呼叫了包含 `Tone.now()` 的函式（如 `playKick`）。
*   **解法**：全面檢查 `audioEngine.js`，將所有 `(time !== undefined) ? time : Tone.now()` 邏輯顯式化，確保 `t = mStart + offset` 的鏈結完整。

## 4. 帽子積木外觀與防抖 (Debounce)
*   **外觀**：移除 `previousStatement` 並設定 `hat: "cap"`。
*   **冗餘訊息**：範例載入時觸發數十次註冊。
*   **解法**：引入 `hatUpdateTimer` (150ms)，等 Workspace 穩定後才重新編譯監聽器代碼。
