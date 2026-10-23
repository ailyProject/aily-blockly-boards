# STC32CL8K64

Aily 开发板包版本 **0.0.2**，状态 **alpha**。使用 `sdk-mcs251@0.0.2` 和 `compiler-stcxx-toolchain@0.3.0` 的 MCS251 C++11 核心；尚未完成本配置的实板验证。

## 配置依据

- 上游：[arduino-mcs251](https://github.com/coloz/arduino-mcs251)，FQBN：`stc:mcs251:stc32cl8k64`。
- 型号与资源：`tools/variants/devices.json`、`boards.txt`。
- 引脚：`variants/STC32CL8K64/pins_arduino.h` 和 `variants/_common/pins_arduino_common.h`。
- [原厂型号资料](https://www.stcmicro.com/cn/stc/stc32cl8k64.html)。
- 19 个逻辑 GPIO，10 个模拟输入。引脚值使用上游 `P3_2` 等宏；底层编码为 `(port << 4) | bit`，不是连续数字。
- 裸芯片配置列出 variant 的最大逻辑引脚集合；具体封装可能引出更少的引脚。图片为代表封装示意，不能代替封装引脚图。
- 物理焊盘复用：P1.4 / P0.2；P1.5 / P0.3。这些逻辑名称不能当作独立物理引脚。

## 默认模板与功能边界

模板采用 `memory=large`，SDK 固定按 12 MHz 编译。SDK 默认启用 MCS251 C++11 核心，不再使用旧的 `cppcore`、`execution` 选项。空白工作区生成 `#include <Arduino.h>`、`void setup() {}`、`void loop() {}`。

模板加载基础 IO、逻辑、循环、数学、文本、串口、时间和变量库；具体 API 支持范围以当前 SDK 为准。

- 通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对：提供 `Serial` 及 `Serial1`、`Serial3`、`Serial4`，`serialPins` 记录各硬件串口的默认 RX/TX。TSSOP20 未引出 UART2，因此不提供 `Serial2`。`Serial` 是 `Serial1` 的别名，两者不是独立串口。
- `Wire` 的硬件主机/从机默认 SDA=P3.3、SCL=P3.2。IIC 需要外部上拉。
- `SPI` 默认 MOSI=P1.3、MISO=P1.4、SCK=P1.5、SS=P1.2，对应硬件 SPI 数据路由。补齐 2～128 分频选项；频率为请求值，未匹配硬件路由或时钟条件时会回退软件 SPI。
- UART1、UART3、UART4 分别占用 Timer1、Timer3、Timer4。UART4 与 SPI 默认数据引脚有物理焊盘复用，不能同时使用。使用 `configurationError()` 检查初始化结果；以上为配置与源码核对，未做实板通信验证。
- 外部中断仅 P3.2 / INT0、P3.3 / INT1，模式仅 LOW / FALLING。
- `pwmPins` 按 arduino-stc51 0.0.7 的 `cores/STC/wiring_analog_write.c` 路由表与本型号 GPIO 掩码取交集，列出 11 个 `analogWrite()` 可用引脚（仅正向输出）。同一 PWM 通道的不同映射引脚不能同时独立输出；具体可用引脚仍取决于封装。
- 裸芯片无板载 LED，因此 `builtinLed` 为空。
- 本型号使用实验 MCS251 构建配置。

### 时钟配置

[官方系列产品资料](https://stcmicro.com/cn/stc/stc32cl8k64.html)列出可调整的内部 IRC 和包含 24 MHz 的外部晶振范围；[STC32G 技术参考手册](https://stcmicro.com/datasheet/stc32g-cn.pdf)时钟管理章节说明时钟源选择及 ISP 频率配置。芯片支持 24 MHz，不代表当前 SDK 已提供该菜单。

本型号的 SDK 编译时钟固定为 12 MHz。

SDK 的 `build.f_cpu=12000000L` 使编译参数为 `F_CPU=12000000L`。首次使用及切换已有工程时，须在官方 ISP 中核对用户程序实际时钟为 12 MHz，并匹配 MCS251 执行模式；核心和现有上传命令不会自动切换系统时钟。实际时钟与 `F_CPU` 不同会影响计时、延时和串口波特率。若需要 24 MHz，应先扩展并验证 SDK 的相应菜单。

## 工具依赖

以本包 `package.json` 的 `boardDependencies` 为准：

| 组件 | 版本 |
| --- | --- |
| `@aily-project/compiler-stcxx-toolchain` | 0.3.0 |
| `@aily-project/tool-stc-cli` | 0.1.0 |
| `@aily-project/sdk-mcs251` | 0.0.2 |
| `@aily-project/tool-ctags` | 5.8.0 |

## 编译与烧录

本包不覆盖 `uploadParam`，由 SDK 在预处理结果中生成 `stc-cli` 上传命令。上传前核对芯片型号、用户程序时钟和 MCS251 执行模式，按上传提示手动复位或断电后上电。烧录功能和外设运行仍需按实际硬件验证。

## 配置核对（2026-10-23）

模板默认值、菜单 ID 与当前 SDK 的 `boards.txt` 已逐项核对；默认编译时钟解析为 `F_CPU=12000000L`。已移除旧 `cppcore`、`execution` 配置和菜单，并修正时钟说明。未执行固件上传或实板时钟、通信与外设运行测试。
