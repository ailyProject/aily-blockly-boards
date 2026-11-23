# Matrixbit AI Board V3.0 (RP2040)

This board uses the Arduino-Pico `rpipico` target with 2 MB Flash. Its I2C bus is
wired to GP20 (SDA) and GP21 (SCL), rather than the target's default GP4/GP5.

New projects copy `template/src/matrixbit_board_init.cpp` into the project's
`src` directory and enable the `AILY_MATRIXBIT_AI_BOARD` project macro. The
Arduino-Pico `initVariant()` hook remaps `Wire` before `setup()` and all generated
library initialization. Libraries remain responsible for calling `Wire.begin()`.

For an existing project created with an earlier template, copy this source file
into the project's `src` directory, add `AILY_MATRIXBIT_AI_BOARD` to the project's
`MACROS` array in `package.json`, and remove the old Wire include/remapping custom
blocks. When changing boards, use the new board's project macro settings; without
the Matrixbit macro, the retained source file has no effect.

Hardware documentation:
https://www.nologo.tech/product/esp32/esp32s3/esp32s3matrixbitv3.0/wendang.html
