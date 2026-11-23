// The project macro is removed when switching to another board, so a retained
// source file cannot change that board's I2C pins or override its initVariant.
#if defined(ARDUINO_ARCH_RP2040) && defined(AILY_MATRIXBIT_AI_BOARD)
#include <Wire.h>

// Arduino-Pico calls this hook after global constructors and before setup().
// Remap the bus before any library can call Wire.begin() in its setup code.
void initVariant() {
  Wire.setSDA(20);
  Wire.setSCL(21);
}
#endif
