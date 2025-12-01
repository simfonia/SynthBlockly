# PiBlockly Synth — Web 範例

簡易範例包含：Blockly 編輯區、Tone.js 合成器、p5.js 波形顯示、Web MIDI 與 Web Serial 範例連線。

注意事項：Web MIDI / Web Serial 必須在安全來源 (https) 或 `localhost` 下運作；建議使用 Chrome / Chromium 瀏覽器。

快速啟動（PowerShell）：

```powershell
# 在 web 目錄啟動簡易 HTTP 伺服器（需安裝 Python 或 node http-server）
# 使用 Python 3:
python -m http.server 8000

# 或使用 npx http-server（若已安裝 Node.js）:
npx http-server -p 8000

# 之後在瀏覽器開啟 http://localhost:8000
```

檔案：
- `index.html`：主頁面（Blockly + 控制按鈕 + 波形）
- `styles.css`：樣式
- `app.js`：範例邏輯（MIDI / Serial / Tone.js / p5 波形）

下一步建議：
- 加入自訂 Blockly 積木並實作產生 Tone.js 程式碼的 generator。
- 新增預錄鼓聲樣本並提供 sample player 選項。
