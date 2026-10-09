# Seekfree STC32G12K128 核心板

逐飞 STC32G12K128（LQFP64）核心板配置，硬件依据为 V2.1 原理图。包名为 `@aily-project/board-seekfree_stc32g12k128`，包版本 `0.0.2`，使用 `@aily-project/sdk-mcs251@0.0.2`，FQBN 为 `stc:mcs251:stc32g12k128`。状态为 `alpha`，尚未进行实板烧录与运行验证。

## 硬件与引脚

- MCU Flash 为 128 KB。V2.0 / V2.1 的 MCU 供电为 3.3 V；V1.0 的供电设计不同，请按实物版本核对电平。
- 配置提供 59 个数字引脚、14 个 ADC 输入和 24 个 SDK `analogWrite()` 路由引脚。引脚值使用 `P0_0` 等 SDK 宏，不能用连续编号代替。
- `P5_4` 接复位按键及复位电路，不列入通用数字、ADC 和 PWM 下拉列表，因此 ADC 列表跳过 `A2`；不能把它替换为该封装不存在的 `P1_2`。
- `P1_6` / `P1_7` 的可选晶振在 V2.1 原理图中标为不贴装，默认可作 GPIO；若自行焊接晶振，则不应再将它们用于通用 IO。
- 蓝色 LED 接 `P5_2`，低电平点亮。`builtinLed` 直接返回 `P5_2`；芯片级 SDK 的 `LED_BUILTIN` 仍为 `NOT_A_PIN`，手写代码请使用 `P5_2`。
- 同一 PWM 通道的多个路由不能同时作为独立 PWM 通道使用。

| 接口 | 当前 SDK 的默认引脚 |
| --- | --- |
| UART1 / `Serial` | RX=P3.0，TX=P3.1，连接板载 USB 转串口电路 |
| UART1 / `Serial1` | RX=P3.0，TX=P3.1；关闭 CDC 时与 `Serial` 是同一串口 |
| UART2 / `Serial2` | RX=P1.0，TX=P1.1 |
| UART3 / `Serial3` | RX=P0.0，TX=P0.1 |
| UART4 / `Serial4` | RX=P0.2，TX=P0.3 |
| 硬件 I²C / `Wire` | SDA=P3.3，SCL=P3.2 |
| 硬件 SPI / `SPI` | MOSI=P1.3，MISO=P1.4，SCK=P1.5，SS=P1.0 |
| 外部中断 | P3.2 / INT0、P3.3 / INT1；LOW、FALLING |

默认 I²C 与外部中断共用引脚，SPI 与部分 ADC 输入共用引脚，不能同时占用同一引脚。

通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对，补齐硬件串口选项、`serialPins` 和 SPI 的 2～128 分频选项。`Serial` 由 CDC 菜单选择 USB CDC 或 UART1，`Serial1` 始终为 UART1；各 UART 按编号占用对应定时器，`Serial2` 与 `tone()` 的 Timer2 存在冲突。UART2 的默认 RX=P1.0 也与 SPI 默认 SS 共用，使用时需另选片选或完整串口路由。

`Wire` 主机和硬件从机均使用表中的默认引脚，需要外部上拉。`SPI` 的默认 SS 仍为 P1.0，不能直接以硬件路由宏 `PIN_SPI1_SS` 的 P5.4 替换，因为板上 P5.4 用于复位。SPI 频率为请求值，硬件运行还取决于路由和时钟条件，可通过 `usingHardware()` 查询。本次未做实板通信验证。

## 默认项目与烧录

模板使用当前 SDK 的 MCS251 C++ 核心，默认 `clock=12m,memory=large,cdc=disabled`。当前 SDK 此型号仅提供 12 MHz 时钟选项，不沿用旧版芯片包的 `clock=24m`、`cppcore` 参数。

编译时钟必须与芯片实际时钟一致。逐飞 Keil 示例库会将系统时钟设为 30 MHz，而本包使用 Arduino SDK，不包含该初始化代码。首次使用请在 STC-ISP 中核对内部 12 MHz 时钟、MCS251 执行模式和 P5.4 复位功能。

Type-C 接口连接的是 USB 转串口芯片，并非 MCU 的原生 USB。模板关闭 USB CDC，使 `Serial` 使用 UART1。V2.1 更换了 USB 转串口芯片，使用 AI8H2K12U。

包不覆盖 `uploadParam`，由 Aily 读取 SDK 在 `preprocess.json` 中生成的 `stc-cli` 上传命令，使用 UART、115200 波特率和手动复位。开始上传、等待连接后按板上 RST。SDK 上传目标属于实验支持，命令会核对 `STC32G12K128` 型号。

LED 示例：

```cpp
#include <Arduino.h>

void setup() {
  pinMode(P5_2, OUTPUT);
  digitalWrite(P5_2, HIGH);
}

void loop() {
  digitalWrite(P5_2, LOW);
  delay(500);
  digitalWrite(P5_2, HIGH);
  delay(500);
}
```

## 资料来源

- [逐飞产品资料及产品图片](https://www.seekfree.com.cn/产品资料/核心板/stc系列/stc32g核心板/)
- [逐飞官方资料库](https://gitee.com/seekfree/STC32G12K128_Library)：`STC32G_CoreBoard_V2.1.pdf`、`STC32G核心板说明书（1.2）.pdf`、`Example/Coreboard_Demo/E01_led_demo/user/main.c`。
- [arduino-stc51](https://github.com/coloz/arduino-stc51)：以所依赖 SDK 的 `boards.txt`、`variants/STC32G12K128/pins_arduino.h`、`variants/_common/pins_arduino_common.h` 和 `cores/STC/wiring_analog_write.c` 核对菜单及外设映射。
- `board.webp` 以逐飞产品页的 V2.0 外观图片为参考，经图像工具处理为 200×200 透明背景 WebP，USB 接口朝左，板卡居中。

## 验证记录（2026-09-22）

- 仓库开发板规范检查、全部 JSON、11 种语言菜单键、SDK 菜单默认值、GPIO 掩码和 ADC 别名检查通过；索引生成器可发现本包，`npm pack --dry-run` 通过。
- 使用本机 `aily-builder 1.2.17`、`sdk-mcs251 0.0.7`、`compiler-stcxx-toolchain 0.2.0`，按模板默认参数编译并链接测试程序成功，生成 HEX，程序占用 27,063 字节。
- 测试程序包含全部声明的引脚常量、时钟和总线引脚编译期断言，以及 LED、ADC、PWM、外部中断、`Serial` / `String`、`Wire` 和 `SPI` API 调用。
- 预处理结果中的 UART 上传命令已核对。未执行上传；以上结果不代表实板时钟、通信或外设运行测试通过。
