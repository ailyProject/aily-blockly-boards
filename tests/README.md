# XIAO nRF52840 Sense upload regression

Run this suite against the real SDK, builder source and host upload implementation:

```sh
AILY_BUILDER_SOURCE=/path/to/aily-builder \
AILY_BLOCKLY_ROOT=/path/to/aily--blockly \
AILY_TEST_SDK_PATH='/path/to/isolated-appdata/sdk/arm-ble_0.4.0' \
AILY_VALIDATION_PROJECT=/path/to/compiled-project \
AILY_TEST_APPDATA=/path/to/isolated-appdata \
AILY_TEST_GCC_BIN=/path/to/gcc-arm-none-eabi/bin \
node --test tests/xiao-nrf52840-sense-upload.test.cjs
```

Prerequisites:

- Install the builder checkout's dependencies, including `tsx`. Verification used builder 1.2.17.
- Install SDK `arm-ble@0.4.0`, compiler `gcc-arm-none-eabi@10.3.1`, ctags and `adafruit-nrfutil@1.7.0` in an isolated Aily directory. Keep the SDK as a real directory: its parent-relative tool path models the installed layout.
- Create the project from this board's template, install this local board package and its libraries, then compile through the host's existing `child/scripts/compile.js`. Include USB `Serial`, `NimBLEDevice`, `Wire` and `SPI` in the sketch. The suite consumes the actual `.temp/preprocess.json` and `.build/sketch.elf` / `.zip`; missing evidence is an error, not a skipped test.

The suite calls the builder's actual property resolvers for Windows, macOS and Linux. Only the current host performs compilation and executable checks. Cross-platform property resolution does not prove native execution on another OS.

`fixtures/upload-io.cjs` replaces only serial-port I/O and child-process spawning while the real host `upload.js` runs. It checks the 1200-bps reset, bootloader-port selection, ZIP command arguments and both successful and failed tool exit codes. It does not upload to hardware. A physical board is still needed to verify USB enumeration, bootloader entry, DFU transfer and the uploaded application's behavior.
