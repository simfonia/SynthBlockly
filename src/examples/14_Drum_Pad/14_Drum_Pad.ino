/*
 * SynthBlockly - Chord_Pad (16-Key Standard Mode)
 * 
 * 讀取 TTP229 16 個按鍵狀態，並透過 Serial 發送 KEY:1 ~ KEY:16。
 * 
 * 硬體注意:
 * 1. 若您的模組為 8 鍵模式 (未改硬體)，讀取第 9~16 鍵時會重複第 1~8 鍵的訊號 (例如按1會送出 KEY:1 和 KEY:9)。
 * 2. 建議只使用前 8 鍵，或將晶片 Pin 3 (TP2) 接地以開啟真正的 16 鍵模式。
 */

#define SCL_PIN 2
#define SDO_PIN 3

// 使用 16 位元變數來儲存按鍵狀態
uint16_t currentKeys = 0;
uint16_t lastKeys = 0;

void setup() {
  Serial.begin(9600);
  pinMode(SCL_PIN, OUTPUT);
  pinMode(SDO_PIN, INPUT);
  digitalWrite(SCL_PIN, HIGH);
  Serial.println("Chord Pad Ready.");
}

void loop() {
  currentKeys = 0;

  // 讀取 16 個按鍵
  for (int i = 0; i < 16; i++) {
    digitalWrite(SCL_PIN, LOW);
    delayMicroseconds(50); // 穩定訊號
    
    // TTP229 預設 Active Low
    if (digitalRead(SDO_PIN) == LOW) {
      currentKeys |= (1 << i);
    }
    
    digitalWrite(SCL_PIN, HIGH);
    delayMicroseconds(50);
  }

  // 偵測變化
  for (int i = 0; i < 16; i++) {
    bool isPressed = bitRead(currentKeys, i);
    bool wasPressed = bitRead(lastKeys, i);

    // 只有在「按下瞬間」發送
    if (isPressed && !wasPressed) {
      Serial.print("KEY:");
      Serial.println(i + 1);
      
      // 加入微小延遲，避免同時按多鍵時訊號黏在一起
      // 和弦模式通常是單指觸發，所以這個延遲影響不大
      delay(20); 
    }
  }

  lastKeys = currentKeys;
  delay(20); 
}
