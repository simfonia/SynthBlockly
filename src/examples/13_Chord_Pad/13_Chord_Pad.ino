/*
 * SynthBlockly - Chord_Pad (16-Key Standard Mode)
 * 
 * 讀取 TTP229 16 個按鍵狀態，並透過 Serial 發送 KEY:1 ~ KEY:16。
 */

#define SCL_PIN 2
#define SDO_PIN 3

uint16_t currentKeys = 0;
uint16_t lastKeys = 0;

void setup() {
  Serial.begin(9600);
  pinMode(SCL_PIN, OUTPUT);
  pinMode(SDO_PIN, INPUT);
  digitalWrite(SCL_PIN, HIGH);
}

void loop() {
  currentKeys = 0;
  for (int i = 0; i < 16; i++) {
    digitalWrite(SCL_PIN, LOW);
    delayMicroseconds(50);
    if (digitalRead(SDO_PIN) == LOW) {
      currentKeys |= (1 << i);
    }
    digitalWrite(SCL_PIN, HIGH);
    delayMicroseconds(50);
  }

  for (int i = 0; i < 16; i++) {
    bool isPressed = bitRead(currentKeys, i);
    bool wasPressed = bitRead(lastKeys, i);
    if (isPressed && !wasPressed) {
      Serial.print("KEY:");
      Serial.println(i + 1);
      delay(20); 
    }
  }
  lastKeys = currentKeys;
  delay(20); 
}
