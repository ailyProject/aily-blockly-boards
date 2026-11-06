# XIAO nRF52840 Sense

This package uses the n-able Arduino `seeed52840sense` target and its dedicated XIAO variant. `Serial` is USB CDC; `Serial1` uses D6/TX and D7/RX. The default bootloader option is `adafruit_ble`, matching the factory Adafruit BLE bootloader with S140 v7. The application starts at `0x27000`; uploading an application does not install or replace the bootloader.

Pin mapping follows the [Seeed Studio XIAO nRF52840 Series documentation](https://wiki.seeedstudio.com/XIAO_BLE/).

## USB serial upload

Select the board's USB serial port and upload. The SDK supplies the 1200-bps reset and bootloader-port wait flags, generates the application DFU ZIP, and resolves the `adafruit-nrfutil` command. The package declares `tool-adafruit-nrfutil@1.7.0`; the template resolves it from Aily's sibling `sdk/` and `tools/` directories without requiring a system PATH installation. If the application has no working USB port, double-press RESET and select the bootloader port before uploading.

Known tool limitation: the bundled `adafruit-nrfutil` may print `Failed to upgrade target` while returning exit code 0 (reproduced with a nonexistent serial port). Check the upload log and the running board; a successful process exit alone does not prove that firmware was uploaded. This board configuration does not change the host application's error handling.

The template also forwards the SDK's `{bootloader.flags}` through the C/C++/assembly extra flags. SDK 0.4.0's dedicated Sense recipe omits these flags from `build.extra_flags`; they are needed to reserve the bootloader area when the core writes persistent data. The template sets `build.lfclk_flags=-DUSE_LFXO` to match the dedicated variant's onboard low-frequency crystal and avoid the platform's default `USE_LFRC`. The Generic-only `lfclk` menu is omitted.

The existing `linkUploadParam` remains available for SWD probes. Select a bootloader setting that matches the hardware; `none` is for a deliberately bootloader-free SWD setup and does not support USB DFU.

## Upgrade from 0.1.0

Version 0.2.0 changes GPIO values from Generic physical pin numbers to the SDK's XIAO logical pin numbers. D0–D10 now use 0–10, and the red/green/blue LEDs use 11/13/12. Review and reselect pins in existing projects; stored numeric pin values are not migrated automatically. `Wire` uses D4/D5 and `SPI` uses D8/D9/D10.

Existing project settings are not replaced by upgrading a board package. Copy the updated `projectConfig` from `template/package.json` (including the tool path and extra flags), or create a new project with this version. Keeping the old `bootloader=none` does not enable serial DFU. Preserve project-specific BLE role/debug choices when migrating.

References: [n-able Arduino bootloader guidance](https://github.com/h2zero/n-able-Arduino#bootloader) and [Seeed USB/bootloader guidance](https://wiki.seeedstudio.com/XIAO_BLE/).
