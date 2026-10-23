# STC32G144K246

Aily 开发板包版本 **0.0.2**，状态 **alpha**。使用 `sdk-mcs251@0.0.2` 和 `compiler-stcxx-toolchain@0.3.0` 的 MCS251 C++11 核心；尚未完成本配置的实板验证。

## 配置依据

- 上游：[arduino-mcs251](https://github.com/coloz/arduino-mcs251)，FQBN：`stc:mcs251:stc32g144k246`。
- 型号与资源：`tools/variants/devices.json`、`boards.txt`。
- 引脚：`variants/STC32G144K246/pins_arduino.h` 和 `variants/_common/pins_arduino_common.h`。
- [原厂型号资料](https://www.stcmicro.com/stc/stc32g144k246.html)。
- 92 个逻辑 GPIO，11 个模拟输入。引脚值使用上游 `P3_2` 等宏；底层编码为 `(port << 4) | bit`，不是连续数字。
- 裸芯片配置列出 variant 的最大逻辑引脚集合；具体封装可能引出更少的引脚。图片为代表封装示意，不能代替封装引脚图。
- 物理焊盘复用：P1.3 / P1.7。这些逻辑名称不能当作独立物理引脚。
- 物理 Flash 为 251904 字节，当前链接窗口仅为 186368 字节，不应扩大为物理容量。

## 默认模板与功能边界

模板采用 `clock=12m,memory=large`，与当前 SDK 的默认菜单值一致。SDK 默认启用 MCS251 C++11 核心，不再使用旧的 `cppcore`、`execution` 选项。空白工作区生成 `#include <Arduino.h>`、`void setup() {}`、`void loop() {}`。

模板加载基础 IO、逻辑、循环、数学、文本、串口、时间和变量库；具体 API 支持范围以当前 SDK 为准。

- 通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对：提供 `Serial` 及 `Serial1`～`Serial8`，`serialPins` 记录各硬件串口的默认 RX/TX。`Serial` 由 USB CDC 菜单选择 UART1 或 USB CDC；`Serial1` 始终为 UART1。
- `Wire` 的硬件主机/从机默认 SDA=P3.3、SCL=P3.2。独立 IIC2 使用 `Wire1`，默认 SDA=P2.6、SCL=P2.7。IIC 需要外部上拉。
- `SPI` 默认 MOSI=P3.2、MISO=P3.3、SCK=P3.4、SS=P3.5，仍使用软件接线；可通过 `setPinsChecked()` 选择完整硬件路由。`SPI1` 对应硬件 SPI2（P6.5/P6.6/P6.7，SS=P6.4），`SPI2` 对应硬件 SPI3（P2.3/P2.4/P2.5，SS=P2.2）；硬件运行依赖有效的 HSIO/PLL 配置。补齐 2～128 分频选项；频率为请求值，未匹配硬件路由或时钟条件时会回退软件 SPI。
- UART1 使用 Timer1，其余 UART 按编号使用对应定时器；`Serial2` 与 `tone()` 的 Timer2 存在冲突。各接口还需避开引脚复用冲突，使用 `configurationError()` 检查初始化结果。以上为配置与源码核对，未做实板通信验证。
- 外部中断仅 P3.2 / INT0、P3.3 / INT1，模式仅 LOW / FALLING。
- `pwmPins` 按 arduino-stc51 0.0.7 的 `cores/STC/wiring_analog_write.c` 路由表与本型号 GPIO 掩码取交集，列出 25 个 `analogWrite()` 可用引脚（仅正向输出）。同一 PWM 通道的不同映射引脚不能同时独立输出；具体可用引脚仍取决于封装。
- 裸芯片无板载 LED，因此 `builtinLed` 为空。
- 本型号使用实验 MCS251 构建配置。

### 时钟配置

[官方 STC32G144K246 手册](https://www.stcmicro.com/datasheet/STC32G144K246-cn.pdf#page=248)第 8.2 节（PDF 第 248 页）区分 ISP 固定 24 MHz 与用户程序采用的上次 ISP 调节频率；第 11.4.1 节（PDF 第 292～293 页）提供选择 24 MHz 的代码。24 MHz 是有效硬件频率，SDK 的菜单范围不能视为芯片硬件限制。

当前 SDK 的本型号时钟菜单为 `12m`、`48m`，默认值为 `12m`。旧模板中的 `clock=24m` 是 SDK 迁移后遗留的无效选项；本次改为合法默认值，不据此认定芯片不支持 24 MHz，也不认定芯片出厂默认 12 MHz。

`clock=12m` 使编译参数为 `F_CPU=12000000L`。首次使用及切换已有工程时，须在官方 ISP 中核对用户程序实际时钟为 12 MHz，并匹配 MCS251 执行模式；核心和现有上传命令不会自动切换系统时钟。实际时钟与 `F_CPU` 不同会影响计时、延时和串口波特率。若需要 24 MHz，应先扩展并验证 SDK 的相应菜单。

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
