/*
 * SynthBlockly - 8-Key Touch Pad (Bitmask Mode)
 * 
 * 高效能模式：使用 Bitmask 一次傳送多個按鍵狀態，支援同時觸發 (Polyphony)。
 */

#define SCL_PIN 2
#define SDO_PIN 3

uint8_t lastKeys = 0;

void setup() {
  Serial.begin(9600);
  pinMode(SCL_PIN, OUTPUT);
  pinMode(SDO_PIN, INPUT);
  digitalWrite(SCL_PIN, HIGH);
  Serial.println("8-Key Bitmask Mode Ready.");
}

void loop() {
  uint8_t currentKeys = 0;

  // 1. 讀取 8 個按鍵狀態
  for (int i = 0; i < 8; i++) {
    digitalWrite(SCL_PIN, LOW);
    // TTP229 讀取時序
    if (digitalRead(SDO_PIN) == LOW) { // Active Low
      currentKeys |= (1 << i);
    }
    digitalWrite(SCL_PIN, HIGH);
  }

  // 2. 計算 Rising Edge (剛剛被按下的鍵)
  // 邏輯：(現在有按) AND (之前沒按)
  uint8_t risingButtons = currentKeys & ~lastKeys;

  // 3. 如果有任何新按鍵被觸發，發送 Bitmask
  if (risingButtons > 0) {
    Serial.print("KEYS:");
    Serial.println(risingButtons); // 例如同時按1和2，會發送 KEYS:3 (二進制 00000011)
  }

  lastKeys = currentKeys;
  delay(10); // 短暫延遲，保持靈敏度
}