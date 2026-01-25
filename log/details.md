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

---

# 技術細節 2026-01-20

## 1. 效果器時序與重複建立問題
*   **背景**：`sb_setup_effect` 既用於初始化（帽子積木掃描註解），也用於執行期更新（線性流程或 `updateFilter`）。
*   **修正 A (線性)**：新增 `addEffectToChain(config)`。Generator 產生執行碼，使連續積木能疊加效果器。
*   **修正 B (重置恢復)**：點擊「執行」會觸發 `resetAudioEngineState`。實作 `forceRebuildHatEffects()`，在 Reset 後立即掃描工作區帽子積木並補回效果器節點。
*   **修正 C (事件過濾)**：在事件監聽器 `Function` 中使用 Regex 濾除 `addEffectToChain` 的執行碼，避免事件每次觸發都產生新的音訊節點。

## 2. ADSR 視覺預覽與引擎狀態衝突
*   **問題**：點選 ADSR 積木預覽會覆蓋 `audioEngine.currentADSR`，導致後續切換樂器或發聲時參數被污染。
*   **解法**：
    1. 拆分 `updateADSR` 為 `updateADSR` (全域) 與 `updateADSRUI` (純繪圖)。
    2. Blockly 選取事件僅呼叫 `updateADSRUI`。
    3. `playCurrentInstrumentNote` 內部加入 `syncAdsrToUI()` 呼叫，確保發聲時 UI 自動跳回真實參數。

## 3. Serial Port 占用與連線狀態
*   **報錯**：`InvalidStateError: The port is already closed.`。
*   **成因**：`disconnectSerial` 在連線失敗的情境下重複呼叫關閉。
*   **解法**：在 `connectSerial` 的 `catch` 區塊加入 cleanup，並在 `disconnectSerial` 增加 `try-catch` 忽略已關閉狀態，確保 `serialPort` 變數能確實歸零為 `null`。

## 4. 參數容錯 (safeNum)
*   **坑點**：參數使用變數名時，傳入 `new Tone.Filter("filterFreq")` 導致崩潰。
*   **修正**：所有建構子參數封裝 `safeNum(val, def)`，若 `Number(val)` 為 `NaN` 則回傳預設值。這確保了 Filter 節點能先「占位」成功，等待後續 `updateFilter` 傳入正確數值。

---

# 技術細節 2026-01-21

## 1. 分軌效果器路由 (Multi-track Routing)
*   **挑戰**：原本所有樂器都直連 Master，如何讓特定樂器流經獨立效果器而不影響其他軌？
*   **解決方案**：
    1.  建立 `instrumentEffects` 字典，Key 為樂器名稱，Value 為效果器陣列。
    2.  實作 `_reconnectAll()`：
        - 先將所有樂器 `disconnect()`。
        - 樂器連至自己的 `Local Effects`。
        - `Local Effects` 連至全域 `Master Effects`。
        - `Master Effects` 連至 `Analyser` 與輸出。
*   **坑點**：在 `rebuildEffectChain` 或 `addEffectToChain` 時，必須先 dispose 舊有的局部效果器，否則會造成記憶體洩漏與聲音重疊。

## 2. 動態下拉選單載入報錯 (Unavailable Option Error)
*   **現象**：載入 XML 時，Blockly 報錯 `Cannot set the dropdown's value to an unavailable option`。
*   **成因**：Blockly 恢復欄位值的順序可能早於工作區積木掃描完成。當 Dropdown 被要求設為 `MyPiano` 時，動態產生器回傳的 options 裡還沒有 `MyPiano`。
*   **解法**：
    ```javascript
    const currentValue = this.getValue();
    if (currentValue && !options.some(opt => opt[1] === currentValue)) {
        options.push([currentValue, currentValue]);
    }
    ```
    在產生的那一刻，強制將「當前值」塞進合法選項清單中。這確保了載入階段的安全性，且不影響稍後點開選單時的正確性。

## 3. 效果器參數的變數支援
*   **問題**：`sb_setup_effect` 的參數如果接「變數積木」，在 `audioEngine.addEffectToChain` 中會因為 `JSON.stringify` 導致變數名變成字串而失效。
*   **修正**：修改 Generator，使用 `Object.assign` 動態合併靜態配置與執行期的變數表達式。
    - 靜態註解：`/* EFFECT_CONFIG:{...} */` 用於初始化。
    - 執行碼：`addEffectToChain(Object.assign(config, { target: variableName }))` 確保支援變數目標。
# 技術細節 2026-01-24

## 1. V2.0 優先權產生碼 (Priority-based Code Gen)
* **問題**：使用者在 XML 中隨意擺放積木（如樂器建立放在底部），導致執行時 `playNote` 找不到樂器。
* **解法**：在 `blocklyManager.js` 的 `getBlocksCode` 中分類掃描 Top Blocks。
* **關鍵**：在遍歷鏈結時，必須暫時使用 `nextConnection.disconnect()` 與 `Blockly.Events.disable()`，否則 `blockToCode` 會因為遞迴而產生重複代碼。

## 2. 下拉選單前向參考 (FieldDropdownLenient)
* **現象**：XML 載入時，若樂器名稱 `MyLead` 尚未被索引，Dropdown 會顯示預設的 `DefaultSynth`。
* **解法**：覆寫 `doClassValidation_` 取消選項檢查，並覆寫 `getOptions` 將 `this.getValue()` 強制補入選項陣列中。
* **坑點**：Generator 函式不可回傳空陣列，否則 Blockly 會拋出致命錯誤。必須在 Generator 或 `getOptions` 最後加上 fallback 選項。

## 3. Tone.js 靜音恢復 Bug (-80dB Hack)
* **現象**：當 `Channel.volume.value` 設為 `-Infinity` (Gain=0) 時，切換 `mute = true/false` 會導致音量無法恢復。
* **解法**：在音量產生器中將最小值限制在 `0.0001` (-80dB)，避免進入 `-Infinity` 狀態。

## 4. 分軌路由架構
* **路由鏈**：`Instrument -> Local Effects -> Tone.Channel -> Master Effects -> Analyser -> Output`。
* **優點**：音量與 Mute/Solo 控制在效果器之後，更符合混音邏輯，且不影響樂器內部的 ADSR 狀態。

## 2026-01-25 關鍵技術筆記
- **影子積木 (Shadow Block) 穩定性**：不要在影子積木（如音序器來源）中使用 Mutation 增減欄位，否則 XML 載入會報欄位缺失。應在 init 定義好所有 field 並用 setVisible 切換。
- **積木重複註冊 Bug**：sb_rhythm_source_selector 曾因同時存在於 instruments 與 transport 檔案中導致選單失靈。已統一由 instruments_blocks.js 定義。
- **旋律解析優先權**：playMelodyString 採用「Rest > Strict Note (C4) > Chord (Cmaj7)」順序，確保 C4Q 不會因同名和弦而失效。
- **Blockly 禁用狀態渲染**：單純設定 block.enabled = false 可能不會觸發即時變灰。解決方案：使用 block.setDisabledReason(true, 'reason_id') 配合 block.render()，這是目前最穩健的視覺反饋方式。
