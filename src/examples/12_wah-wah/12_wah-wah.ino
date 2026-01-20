// --- SynthBlockly Wah-Wah & Kick Trigger ---

// 連接腳位設定
const int buttonPin = 4; // 按鈕接到 D4
const int ldrPin = A0;   // LDR 的類比輸出接到 A0

// 按鈕狀態與防抖動變數
int buttonState = HIGH;         // 按鈕的當前穩定狀態
int lastButtonState = HIGH;     // 按鈕的上一個讀取狀態
unsigned long lastDebounceTime = 0; // 最後一次抖動時間
unsigned long debounceDelay = 50;   // 防抖動延遲

// LDR 發送間隔變數
unsigned long lastLdrTime = 0;
unsigned long ldrInterval = 50; // 每 50 毫秒發送一次 LDR 數值

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT_PULLUP); // 啟用內建上拉電阻
}

void loop() {
  // --- 按鈕處理 (使用標準的防抖動與邊緣檢測) ---
  int reading = digitalRead(buttonPin); // 讀取當前按鈕的瞬間狀態

  // 如果開關狀態改變了（可能因為雜訊或按下），重置計時器
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  // 當距離上次狀態改變超過延遲時間後
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // 如果當前的讀取值與已確認的穩定狀態不同
    if (reading != buttonState) {
      buttonState = reading; // 更新穩定狀態

      // 只有在按鈕「剛剛被按下」（從 HIGH 變成 LOW）時，才發送訊息
      if (buttonState == LOW) {
        Serial.println("KICK"); // 發送 "KICK" 字串
      }
    }
  }
  lastButtonState = reading; // 更新上一次的讀取狀態


  // --- LDR 處理 ---
  // 每隔一段時間發送 LDR 數值
  if (millis() - lastLdrTime >= ldrInterval) {
    lastLdrTime = millis();
    int ldrValue = analogRead(ldrPin);
    Serial.print("LDR:"); // 發送 "LDR:" 前綴
    Serial.println(ldrValue);
  }
}