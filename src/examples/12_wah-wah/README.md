# 和弦觸發板 (Chord Pad)

這個範例將您的 TTP229 觸控板變成一個「和弦觸發器」。只要按一個鍵，就能演奏出豐富的鋼琴和弦。

## 專案特色

*   **單指和弦**：將複雜的三和弦映射到單一觸控鍵上。
*   **C 大調順階**：預設設定了 C 大調的 7 個順階和弦 (C, Dm, Em, F, G, Am, Bdim)。
*   **16 鍵架構**：Arduino 程式已準備好支援 16 個按鍵讀取。

## 接線說明 (Wiring)

請將 TTP229 模組與 Arduino 依照下方對應關係連接：

*   **TTP229 VCC** 接到 **Arduino 5V**
*   **TTP229 GND** 接到 **Arduino GND**
*   **TTP229 SCL** 接到 **Arduino D2** (數位腳位 2)
*   **TTP229 SDO** 接到 **Arduino D3** (數位腳位 3)

*(只需接這 4 條線，其他的 OUT1~8 不需要接)*

## 重要：關於 8 鍵與 16 鍵模式
*   **如果您未修改硬體 (預設 8 鍵模式)**：
    *   您只能使用前 8 個按鍵。
    *   若按下第 9~16 號鍵，可能會重複觸發第 1~8 號鍵的功能 (鬼影現象)。
*   **如果您已修改硬體 (16 鍵模式)**：
    *   您可以完全使用 16 個按鍵。
    *   修改方式：將 TTP229 晶片的 **Pin 3 (TP2)** 接地。

## 使用步驟

1.  **上傳程式**：使用 Arduino IDE 上傳 `10_Chord_Pad.ino`。
2.  **載入積木**：在 SynthBlockly 載入此 `main.xml`。
3.  **連線**：點擊「連接序列埠」，選擇您的 Arduino。
4.  **演奏**：
    *   **PAD 1**: C Major (C, E, G)
    *   **PAD 2**: D Minor (D, F, A)
    *   **PAD 3**: E Minor (E, G, B)
    *   **PAD 4**: F Major (F, A, C)
    *   **PAD 5**: G Major (G, B, D)
    *   **PAD 6**: A Minor (A, C, E)
    *   **PAD 7**: B Diminished (B, D, F)
    *   **PAD 8**: C Major High (C, E, G)

## 擴充指南
若您未來開啟了 16 鍵模式，只需在 Blockly 積木中繼續複製 `否則如果 (Else If)` 區塊，並設定 `KEY:9` ~ `KEY:16` 對應的和弦即可。