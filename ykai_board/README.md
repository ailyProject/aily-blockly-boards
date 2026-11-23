# 研坤AI开发板 (YanKun AI Board)

基于 ESP32 的教育型 AI 开发板 AILY Blockly 配置。

> ⚠️ **引脚映射为推断值，未经硬件实测。** 本配置按「掌控板2.0」惯例推断 P0–P16 ↔ GPIO 的对应关系，并已在已知外设上交叉验证（见下表）。如需正式使用，请先在真机上实测确认。

## 硬件资源

| 资源 | 说明 |
| --- | --- |
| MCU | ESP32（双核 Xtensa LX6，Wi-Fi + 蓝牙双模） |
| 显示屏 | 240×240 TFT |
| RGB 彩灯 | NeoPixel，GPIO17 |
| 触摸键 | C / H / A / N / G / E → GPIO 27 / 14 / 12 / 13 / 15 / 4 |
| 用户键 | A / B → GPIO 0 / 2 |
| 光线传感器 | GPIO39 |
| 声音传感器 | GPIO36（A0） |
| 蜂鸣器 | GPIO16 |
| 加速度计 | MSA300（I2C） |
| 手势传感器 | PAJ7620U2（I2C） |

## 推断的引脚映射（未实测）

逻辑引脚沿用「掌控板2.0」惯例，对照已知外设验证如下：

| 逻辑引脚 | GPIO | 备注 |
| --- | --- | --- |
| P0 | 33 | ADC |
| P1 | 32 | ADC |
| P2 | 35 | ADC |
| P3 | 34 | ADC |
| P4 | 39 | 光线传感器 LIGHT |
| P5 | 0  | 用户键 A (BTN_A) |
| P6 | 16 | 蜂鸣器 BUZZER |
| P7 | 17 | RGB 彩灯 |
| P8 | 26 | |
| P9 | 25 | |
| P10 | 36 | 声音传感器 SOUND (A0) |
| P11 | 2  | 用户键 B (BTN_B) |
| P12 | 18 | SPI SCK |
| P13 | 19 | SPI MISO |
| P14 | 21 | I2C SDA |
| P15 | 22 | I2C SCL |
| P16 | 23 | SPI MOSI |

SPI 默认 `MOSI=23 / MISO=19 / SCK=18`；I2C 默认 `SDA=21 / SCL=22`（ESP32 标准，推断）。

触摸键（C=27, H=14, A=12, N=13, G=15, E=4）与用户键、RGB、传感器等专属外设另见 `board.json` 中的 `specialPins` 字段。

## 外设库（YKAI 封装）

屏幕、NeoPixel、触摸键、加速度计、手势识别等高级功能由独立的 YKAI 外设库提供，以 npm 包形式提交至 `aily-blockly-libs` 仓库（本仓库 `aily-blockly-boards` 仅含板卡配置）。详见配套库 `lib-ykai`。

## 合规说明

- 使用 ESP32 通用 SDK：`esp32:esp32:esp32`，核心版本 `3.3.10`；仓库中 3.3.1 / 3.3.10 / 3.3.12 多版本并存，不强制统一。
- `package.json` 的 `version` 与 `boardDependencies.@aily-project/sdk-esp32` 版本保持一致（3.3.10）。
- `template/package.json` 仅含唯一板卡依赖 `@aily-project/board-ykai_board@3.3.10`，其 `board` 字段与 `nickname` 一致。
- 已通过 `.scripts/validate-boards-compliance.js ykai_board`（全部检测项通过）。

## 与《功能引脚申明规范》的对应

- `mcu: "esp32"` — 芯片标识（ESP32 系列板卡需声明）。
- `ws2812Pin: "17"` — 按规范的「单引脚用 `xxxPin`」命名声明板载 RGB 彩灯；`specialPins` 作为板厂自定义扩展保留，库按规范应忽略无法识别的可选字段。
- **未声明 `displayConfig`**：虽然板上带 240×240 TFT，但显示控制器型号、接口与具体 SPI 引脚均缺乏实测资料。按规范「`xxxConfig` 不存在表示开发板未提供该设备的固定配置，库必须保留手动配置方式」，此处不做推断，避免库从错误的固定引脚去驱动屏幕。待硬件实测后可补充。
- `pwmPins` / `servoPins` 已排除仅支持输入的 GPIO34、35、36、39（P3、P2、P10、P4），这些引脚不能输出 PWM 或舵机控制信号。依据：[Espressif GPIO 文档](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/gpio.html)。板级引脚映射仍未经实测，暂不额外声明 `servoConfig`。
