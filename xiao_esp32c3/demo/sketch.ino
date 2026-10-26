#include <Arduino.h>

void setup() {

  pinMode(D2, OUTPUT);

}

void loop() {

  digitalWrite(D2, HIGH);
  delay(1000);
  digitalWrite(D2, LOW);
  delay(1000);

}