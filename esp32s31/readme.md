# ESP32-S31 chip

通用 ESP32-S31 芯片包，包名为 `@aily-project/board-esp32s31`，显示名称为 `ESP32S31 chip`。使用 Arduino SDK 的 `esp32:esp32:esp32s31` 目标，适用于自行设计或接线的 ESP32-S31 硬件。

- [ESP32-S31 芯片规格书](https://documentation.espressif.com/esp32-s31_datasheet_en.html)
- SDK 来源：`D:\Git\aily-project\package-download-upload\download\esp32\hardware\esp32@4.0.0`
- 引脚依据：SDK 的 `variants/esp32s31/pins_arduino.h`、`cores/esp32/HardwareSerial.h` 和 `esp32s31-libs` 中的 SoC 定义。

## SDK 与依赖

包版本为 `4.0.0`，对应本地下载工具规范化后的版本号；上游实际版本为 **Arduino ESP32 4.0.0-RC1**。适配状态为 `alpha`，尚未进行实板验证。

| 依赖 | 版本 |
| --- | --- |
| `@aily-project/sdk-esp32` | `4.0.0` |
| `@aily-project/compiler-esp-rv32` | `15.2.0` |
| `@aily-project/tool-esp32s31-libs` | `4.0.0` |
| `@aily-project/tool-esptool_py` | `5.3.1` |
| `@aily-project/tool-ctags` | `5.8.0` |

## 默认构建设置

初始模板按 SDK 的通用默认值配置，不假设具体开发板的 flash 容量或 USB 接口接线。

| 菜单 | 默认选项 | 含义 |
| --- | --- | --- |
| `FlashSize` | `4M` | 4 MB flash，使用前按实际硬件调整 |
| `PartitionScheme` | `default` | 4 MB 分区：两个 1.25 MiB OTA 应用分区和 SPIFFS |
| `USBMode` | `hwcdc` | Hardware CDC and JTAG |
| `CDCOnBoot` | `default` | 关闭 USB CDC，`Serial` 对应 UART0 |
| `UploadMode` | `default` | UART0 / Hardware CDC 上传 |
| `UploadSpeed` | `921600` | SDK 上传速度选项 |
| `JTAGAdapter` / `MSCOnBoot` / `DFUOnBoot` / `ZigbeeMode` | `default` | 关闭 |
| `DebugLevel` / `EraseFlash` | `none` | 关闭调试日志、不全片擦除 |

`menu.json` 提供 SDK 支持的全部 12 个动态菜单及 11 种语言标题。分区和 flash 容量必须匹配；已有项目升级时需要自行同步 `projectConfig`，模板默认值仅用于新建项目。

SDK 固定 CPU 为 320 MHz、flash 频率为 80 MHz，内存类型为 `qio_opi`，并定义 `BOARD_HAS_PSRAM`。当前目标没有 `CPUFreq`、`FlashFreq`、`FlashMode` 和 `PSRAM` 菜单，因此不提供这些选项。PSRAM 实际容量由硬件决定。

## 引脚与总线

芯片有 60 个 GPIO；通用数字、PWM、舵机和中断列表提供 54 个候选引脚：GPIO0～25、GPIO33～40、GPIO42～61。默认排除片外 flash 使用的 GPIO26/27/28/30/31/32，GPIO29/41 未引出。模拟输入为 GPIO42～57。

这些列表表示候选能力，不代表某块开发板实际引出了所有引脚。GPIO36/37/60/61 是启动配置脚；GPIO33/34、GPIO54～57、GPIO58/59 分别可能用于 USB Serial/JTAG、JTAG、UART0。接线时应核对实际板卡占用。

| 对象 | 引脚 | 使用方式 |
| --- | --- | --- |
| `Serial` / `Serial0` | RX=59、TX=58 | 默认 `Serial.begin(115200)` 使用 UART0 |
| `Serial1` | RX=36、TX=35 | SDK 提供默认引脚 |
| `Serial4`（LP UART） | RX=7、TX=6 | SDK 提供低功耗 UART 的默认引脚 |
| `SPI` | MOSI=38、MISO=39、SCK=40、SS=37 | 可使用 `SPI.begin()` |
| `Wire` | SDA=2、SCL=3 | 可使用 `Wire.begin()` |
| `Wire1` | SDA=51、SCL=50 | 使用 `Wire1.begin(51, 50)` 显式指定 |

`Serial2` / `Serial3` 虽由 SDK 创建，但 ESP32-S31 未定义其默认 RX/TX。普通串口积木会调用无引脚参数的 `begin()`，因此下拉列表只提供具有默认引脚的串口；额外串口需显式初始化，例如 `Serial2.begin(115200, SERIAL_8N1, rxPin, txPin)`。

SDK 只创建全局 `SPI` 对象，不创建 `SPI1`；第二条 SPI 总线需自行创建 `SPIClass` 并指定引脚。`Wire1` 的 51/50 来自 variant 的 `SDA1` / `SCL1`，但该 variant 没有定义 `WIRE1_PIN_DEFINED`，不能依赖无参数 `Wire1.begin()`。

`LED_BUILTIN` 是 SDK 为 GPIO60 RGB LED 定义的虚拟引脚（`SOC_GPIO_PIN_COUNT + 60`），不是普通 GPIO 编号。`builtinLed` 保留该 SDK 常量，仅适用于 GPIO60 实际接有兼容 RGB LED 的硬件；裸芯片不自带 LED。

现有 `pinmap.json` 保留 WROOM-3 风格的引脚布局，并同步本包的总线标签。它用于 GPIO 功能参考，不是 QFN80 芯片焊盘编号图；芯片焊接和封装设计以规格书为准。

## USB 与下载

- 使用 UART0：保留默认模板设置，连接 GPIO58/59。
- 使用 USB Serial/JTAG：设置 `USBMode=hwcdc`、`CDCOnBoot=cdc`、`UploadMode=default`。此时 `Serial` 为硬件 USB CDC，`Serial0` 仍可访问 UART0。
- 使用 USB-OTG TinyUSB：设置 `USBMode=default`、`CDCOnBoot=cdc`、`UploadMode=cdc`，连接硬件的 USB-OTG 接口。该模式启用 1200 bps touch 和等待上传端口。

切换 `CDCOnBoot` 会刷新 Aily 的串口列表。首次下载或应用未提供可用 USB CDC 时，需通过硬件启动配置进入下载模式。bootloader 的 `0x2000` 偏移交由 SDK 上传配方处理。

ESP-Mosaico 具有自己的供电和外设接线，应选择独立的 `esp_mosaico` 包。

## 验证记录

- `node .scripts/validate-boards-compliance.js esp32s31` 检查通过。
- 已校验 SDK 菜单和默认选项、11 种语言翻译键、GPIO/ADC 列表、引脚图总线标签及模板依赖一致性。
- 使用 Arduino CLI 1.5.1 和本地 SDK 4.0.0-RC1，按模板默认配置编译了 UART0/UART1/LP UART、SPI、Wire/Wire1、ADC 和 PWM 验证程序；编译期断言同时核对 SDK 的默认引脚和串口数量。程序占用 385468 字节，生成 4 MB 合并固件。
- 尚未验证实板上传、外设运行、PSRAM 容量和 Aily 界面交互。
