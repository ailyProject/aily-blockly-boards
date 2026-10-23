# AI8051U-34K16

Aily 开发板包版本 **0.0.2**，状态 **alpha**。使用 `sdk-mcs251@0.0.2` 和 `compiler-stcxx-toolchain@0.3.0` 的 MCS251 C++11 核心；尚未完成本配置的实板验证。

## 配置依据

- 上游：[arduino-mcs251](https://github.com/coloz/arduino-mcs251)，FQBN：`stc:mcs251:ai8051u_34k16`。
- 型号与资源：`tools/variants/devices.json`、`boards.txt`。
- 引脚：`variants/AI8051U_34K16/pins_arduino.h` 和 `variants/_common/pins_arduino_common.h`。
- [原厂型号资料](https://www.stcmicro.com/datasheet/Ai8051U_Features.pdf)。
- 46 个逻辑 GPIO，15 个模拟输入。引脚值使用上游 `P3_2` 等宏；底层编码为 `(port << 4) | bit`，不是连续数字。
- 裸芯片配置列出 variant 的最大逻辑引脚集合；具体封装可能引出更少的引脚。图片为代表封装示意，不能代替封装引脚图。
- 物理焊盘复用：P4.4 / P4.5。这些逻辑名称不能当作独立物理引脚。

## 默认模板与功能边界

模板采用 `memory=large`，SDK 固定按 12 MHz 编译。SDK 默认启用 MCS251 C++11 核心，不再使用旧的 `cppcore`、`execution` 选项。空白工作区生成 `#include <Arduino.h>`、`void setup() {}`、`void loop() {}`。

模板加载基础 IO、逻辑、循环、数学、文本、串口、时间和变量库；具体 API 支持范围以当前 SDK 为准。

- 通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对：提供 `Serial` 及 `Serial1`～`Serial4`，`serialPins` 记录各硬件串口的默认 RX/TX。`Serial` 由 USB CDC 菜单选择 UART1 或 USB CDC；`Serial1` 始终为 UART1。
- `Wire` 保留软件主机默认 SDA=P3.2、SCL=P3.3；硬件从机默认 SDA=P3.3、SCL=P3.2。IIC 需要外部上拉。
- `SPI` 默认 MOSI=P3.2、MISO=P3.3、SCK=P3.4、SS=P3.5，仍使用软件接线；可通过 `setPinsChecked()` 选择完整硬件路由。硬件 SPI 默认数据组为 P1.5/P1.6/P1.7，不能与 STC32 的 P1.3/P1.4/P1.5 混用。补齐 2～128 分频选项；频率为请求值，未匹配硬件路由或时钟条件时会回退软件 SPI。
- UART1 使用 Timer1，其余 UART 按编号使用对应定时器；`Serial2` 与 `tone()` 的 Timer2 存在冲突。各接口还需避开引脚复用冲突，使用 `configurationError()` 检查初始化结果。以上为配置与源码核对，未做实板通信验证。
- 外部中断仅 P3.2 / INT0、P3.3 / INT1，模式仅 LOW / FALLING。
- `pwmPins` 按 arduino-stc51 0.0.7 的 `cores/STC/wiring_analog_write.c` 路由表与本型号 GPIO 掩码取交集，列出 28 个 `analogWrite()` 可用引脚（仅正向输出）。同一 PWM 通道的不同映射引脚不能同时独立输出；具体可用引脚仍取决于封装。
- 裸芯片无板载 LED，因此 `builtinLed` 为空。
- 本 SDK 固定使用 MCS251 编译目标；实际芯片执行模式须在官方 ISP 中配置一致。

### 时钟配置

[官方 AI8051U 功能资料](https://www.stcmicro.com/datasheet/Ai8051U_Features.pdf#page=2)第 2 页说明：ISP 监控程序固定使用内部 24 MHz，用户程序使用上次 ISP 下载时调节的时钟；外部晶振范围为 4～42 MHz。ISP 的 24 MHz 不能视为用户程序的固定频率。

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
