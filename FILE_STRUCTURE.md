# SynthBlockly 目標檔案結構

本文檔說明重構後的目標檔案結構。

- `docs/`
  - `index.html`        # HTML 入口檔案
  - `styles.css`        # 樣式表
  - `toolbox.xml`       # Blockly 工具箱定義 (從 blocks/ 移動而來)
  - `assets/`           # 靜態資源 (圖片、音訊樣本)
  - `js/`               # **新的模組化 JavaScript 原始碼**
    - `app.js`          # **新的主應用程式入口**
    - `core/`           # **核心商業邏輯**
      - `audioEngine.js`      # Tone.js 音訊引擎
      - `midiEngine.js`       # Web MIDI 邏輯
      - `serialEngine.js`     # Web Serial 邏輯
      - `blocklyManager.js`   # Blockly 工作區管理
      - `eventManager.js`     # Blockly 事件監聽 (Hat blocks)
    - `ui/`             # **使用者介面相關邏輯**
      - `dom.js`              # DOM 元素參考
      - `buttons.js`          # 按鈕事件綁定
      - `keyboardController.js` # PC 鍵盤控制器
      - `resizer.js`          # 介面縮放邏輯
      - `visualizer.js`       # p5.js 波形視覺化
      - `logger.js`           # 日誌記錄器
    - `blocks/`         # **重構後的積木定義**
      - `index.js`                  # 統一註冊所有積木、生成器和語言
      - `instruments_blocks.js`       # 樂器相關積木
      - `instruments_generators.js`
      - `transport_blocks.js`         # 節拍相關積木
      - `transport_generators.js`
      - `effects_blocks.js`           # 效果器相關積木
      - `effects_generators.js`
      - `midi_blocks.js`              # MIDI 相關積木
      - `midi_generators.js`
      - `keyboard_blocks.js`          # PC 鍵盤相關積木
      - `keyboard_generators.js`
      - `serial_blocks.js`            # 序列埠相關積木
      - `serial_generators.js`
      - `lang/`                     # **語言檔案**
        - `en.js`
        - `zh-hant.js`

---

### 待移除的舊檔案 (重構完成後)

- `docs/main.js`
- `docs/module_loader.js`
- `docs/blocks/` (整個資料夾)
