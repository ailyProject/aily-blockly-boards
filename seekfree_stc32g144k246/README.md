# Seekfree STC32G144K246 核心板

逐飞 STC32G144K246（LQFP100）核心板配置，硬件依据为官方 V1.0 原理图（内部修订 V1.0.2.0）。包名 `@aily-project/board-seekfree_stc32g144k246`，版本 `0.0.2`，状态 `alpha`。使用 `@aily-project/sdk-mcs251@0.0.2`、`@aily-project/compiler-stcxx-toolchain@0.3.0` 和 FQBN `stc:mcs251:stc32g144k246`。

## 硬件与引脚

- 核心板尺寸为 40.64 mm × 40.64 mm，MCU 供电为 3.3 V，Flash 为 251,904 字节。不要将 5 V 电源排针当作 GPIO 电平。
- Type-C 的 D−、D+ 经 22 Ω 电阻直连 P3.0、P3.1，使用 MCU 原生 USB；板上没有 USB 转串口芯片。
- 默认启用 USB CDC，因此通用数字引脚列表排除 P3.0、P3.1。UART1 的 RX/TX 排针与 USB 复用，不能同时运行 UART1 和原生 USB。
- 配置提供 89 个数字引脚、10 个 ADC 输入选项和 25 个 SDK `analogWrite()` 路由引脚。引脚值使用 `P0_0`、`PA_0` 等 SDK 宏，不是连续编号。
- P1.3 与 P1.7 是同一物理焊盘，板上丝印为 P1.7。数字引脚仅列 P1.7；ADC 仅列其 A7 名称，省略重复焊盘的 A3。P1.2 不是独立焊盘。
- P5.4 独立引出，保留为 GPIO / A2 / PWM。RST 按键连接稳压器 EN，按下时切断 MCU 供电，不能把 RST 当成 P5.4。
- P3.2 按键低电平有效，带 10 kΩ 上拉和 100 Ω 串联电阻，同时用于进入 USB ISP。连接外部设备时注意按键及上拉对信号的影响。
- 蓝色用户 LED 接 P5.2，低电平点亮。`builtinLed` 返回 `P5_2`；SDK 的芯片级 `LED_BUILTIN` 仍为 `NOT_A_PIN`，手写代码请使用 `P5_2`。
- P1.6 / P1.7 的可选 12 MHz 外部晶振及电容在原理图中标记为不贴装；焊接晶振后不要再将这两个引脚作为通用 IO。
- 同一 PWM 通道的不同路由不能作为独立通道同时使用。

| 接口 | 当前 SDK 默认引脚 |
| --- | --- |
| `Serial`（默认） | 原生 USB CDC，D−=P3.0、D+=P3.1 |
| UART1 / `Serial1`（默认引脚需停止 USB） | RX=P3.0、TX=P3.1；通过外部 USB 转 TTL 连接排针 |
| UART2 / `Serial2` | RX=P1.0、TX=P1.1 |
| UART3 / `Serial3` | RX=P0.0、TX=P0.1 |
| UART4 / `Serial4` | RX=P0.2、TX=P0.3 |
| UART5 / `Serial5` | RX=P0.4、TX=P0.5 |
| UART6 / `Serial6` | RX=P0.6、TX=P0.7 |
| UART7 / `Serial7` | RX=P5.0、TX=P5.1 |
| UART8 / `Serial8` | RX=P5.2、TX=P5.3；RX 与蓝色 LED 共用 |
| 硬件 I²C / `Wire` | SDA=P3.3、SCL=P3.2 |
| 硬件 IIC2 / `Wire1` | SDA=P2.6、SCL=P2.7 |
| 软件 SPI / `SPI` | MOSI=P3.2、MISO=P3.3、SCK=P3.4、SS=P3.5 |
| SPI2 / `SPI1` | MOSI=P6.5、MISO=P6.6、SCK=P6.7、SS=P6.4 |
| SPI3 / `SPI2` | MOSI=P2.3、MISO=P2.4、SCK=P2.5、SS=P2.2 |
| 外部中断 | P3.2 / INT0、P3.3 / INT1；LOW、FALLING |

I²C、软件 SPI、外部中断和 P3.2 按键共享部分引脚，使用时需要避开冲突。

通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对，补齐 `Serial1`～`Serial8`、`serialPins`、`Wire1`、`SPI1`、`SPI2` 和 SPI 的 2～128 分频选项。`Serial` 仍按 CDC 菜单选择 USB CDC 或 UART1，`Serial1` 始终为 UART1。保留 USB 时，应在 `Serial1.begin()` 前通过 `setPinsChecked(rx, tx)` 选择其他完整硬件路由。各 UART 按编号占用对应定时器，`Serial2` 与 `tone()` 的 Timer2 存在冲突。

两个 IIC 对象均支持主机和硬件从机，需要外部上拉。`SPI` 保留软件默认接线，可显式切换到硬件 SPI1 路由；`SPI1`、`SPI2` 的默认引脚对应独立硬件 SPI2、SPI3。硬件 SPI 需要有效的 HSIO/PLL 配置，驱动不会初始化共享 PLL；路由或时钟条件不满足时回退软件 SPI，通过 `usingHardware()` 查询实际方式。不同 SPI 对象的事务不能重叠。本次未做实板通信验证。

## 默认项目与下载

模板使用 MCS251 C++ 核心，默认 `clock=48m,memory=large,cdc=enabled,xram=high,uploadtransport=auto,uploadcheck=manual`。XRAM 使用高地址 64 KiB 区（0x020000），与 SDK 的 G144 USB 推荐配置一致。菜单提供时钟、内存模型、USB CDC、XRAM 布局、下载接口和型号校验选项。

编译时钟必须与芯片实际时钟一致。请在 STC-ISP 中将内部时钟设为 48 MHz；核心中的 `F_CPU` 不会自动改变 CPU 时钟。逐飞 Keil 示例调用 `clock_init(SYSTEM_CLOCK_96M)`，该初始化代码不属于本包。

首次下载或应用无响应时：连接 Type-C，按住 P3.2 按键，再按下并松开 RST，最后松开 P3.2。此时进入厂商 USB HID ISP。在下载接口菜单选择 `Native USB`，由 SDK 的 `stc-cli-usb` 配方执行下载；也可使用官方 STC-ISP 加载编译得到的 HEX。

已经运行 SDK USB CDC 固件时，可使用默认 `Automatic (USB CDC or UART)`，选择对应 CDC 串口。SDK 配套工具支持通过 CDC 请求重启到 ISP；若未成功进入下载模式，使用上述按键方式。Aily 客户端是否允许未选择串口时启动原生 USB 上传，取决于所用客户端版本。

`uploadParam` 不另行覆盖，上传命令由 SDK 生成。原生 USB 路径使用 `stc-cli usb flash`，不需要 COM 参数；自动路径使用 `stc-cli flash --transport auto`。均属于实验目标支持，本次未做实板烧录及运行验证。

LED 示例：

```cpp
#include <Arduino.h>

void setup() {
  pinMode(P5_2, OUTPUT);
  digitalWrite(P5_2, HIGH);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(P5_2, LOW);
  Serial.println("Seekfree STC32G144K246");
  delay(500);
  digitalWrite(P5_2, HIGH);
  delay(500);
}
```

## 资料来源

- [逐飞官方资料库](https://gitee.com/seekfree/STC32G144K246_100Pin_Library)，核对提交 `37aa6ee2b378280a8a5eee9b74fc2ef03484116c`。
- 原理图：`【原理图】原理图 丝印图 尺寸图 位号图/核心板/V1.0/STC32G144K246_CoreBoard_V1.0.pdf`，第 2 页。
- 使用说明：`【文档】说明书 芯片手册等/STC32G144K 100PIN核心板说明书（1.0）.pdf`。其中功能介绍页关于“板载 CH340E”的句子与原理图及下载章节不符，本配置以原理图和下载章节为准。
- LED 示例：`Example/Coreboard_Demo/E01_led_demo/user/main.c`。
- [arduino-stc51](https://github.com/coloz/arduino-stc51)：以所依赖 SDK 的 `boards.txt`、`variants/STC32G144K246/pins_arduino.h`、`variants/_common/pins_arduino_common.h`、`cores/STC/wiring_analog_write.c` 和 `libraries/USB/README.md` 核对菜单、外设与 USB 默认配置。
- `board.webp` 以用户提供的 V1.0 核心板实物照片为参考，经图像工具处理为 200×200 透明背景 WebP，USB 接口朝左，板卡居中。

## 验证记录（2026-09-22）

- 开发板规范检查通过；GPIO 掩码、ADC 别名、6 项菜单默认值及 11 种语言菜单键与 SDK 核对通过。
- 使用 `aily-builder 1.2.17`、`sdk-mcs251 0.0.1`、`compiler-stcxx-toolchain 0.3.0`，按模板默认参数完成测试程序的编译和链接，生成 HEX。程序占用 39,085 字节，动态内存占用 33,538 字节（含预留堆），高地址 XRAM 上限为 65,536 字节。
- 测试程序覆盖全部声明的引脚常量，以及时钟、USB CDC 和总线引脚编译期断言；包含 LED、ADC、PWM、外部中断、`Serial` / `String`、`Wire` 和 `SPI` API 调用。
- 已分别核对自动下载与原生 USB 下载的预处理命令；未执行上传，未做实板时钟、通信和外设运行验证。
