# STC32G144K246

Aily 开发板包版本 **0.0.1**，状态 **todo**。配置取自 arduino-stc51 0.0.2 当前源码，尚未完成 Aily 工具链安装、端到端编译或实板验证。

## 配置依据

- 上游：[arduino-stc51](https://github.com/coloz/arduino-stc51)，FQBN：`arduino-stc51:mcs51:stc32g144k246`。
- 型号与资源：`tools/variants/devices.json`、`boards.txt`。
- 引脚：`variants/STC32G144K246/pins_arduino.h` 和 `variants/_common/pins_arduino_common.h`。
- [原厂型号资料](https://www.stcmicro.com/stc/stc32g144k246.html)。
- 92 个逻辑 GPIO，11 个模拟输入。引脚值使用上游 `P3_2` 等宏；底层编码为 `(port << 4) | bit`，不是连续数字。
- 裸芯片配置列出 variant 的最大逻辑引脚集合；具体封装可能引出更少的引脚。图片为代表封装示意，不能代替封装引脚图。
- 物理焊盘复用：P1.3 / P1.7。这些逻辑名称不能当作独立物理引脚。
- 物理 Flash 为 251904 字节，当前链接窗口仅为 186368 字节，不应扩大为物理容量。

## 默认模板与功能边界

模板采用 `clock=24m,memory=large,cppcore=plain`，与上游默认构建参数一致。空白工作区生成 `#include <Arduino.h>`、`void setup() {}`、`void loop() {}`，属于该核心接受的 C 语法。时钟菜单必须与 ISP 设置的真实时钟一致；core 不会自动切换系统时钟。

模板只加载基础 IO、逻辑、循环、数学和时间库，保留仓库已有库版本。没有把依赖 String / Print 重载的文本和通用串口库预装到纯 C 模板；基础库中的扩展积木仍需逐项验证，尤其不要将 C++ 重载、函数引用或随机数双参数调用当作纯 C 已兼容。

- 通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对：提供 `Serial` 及 `Serial1`～`Serial8`，`serialPins` 记录各硬件串口的默认 RX/TX。`Serial` 由 USB CDC 菜单选择 UART1 或 USB CDC；`Serial1` 始终为 UART1。
- `Wire` 的硬件主机/从机默认 SDA=P3.3、SCL=P3.2。独立 IIC2 使用 `Wire1`，默认 SDA=P2.6、SCL=P2.7。IIC 需要外部上拉。
- `SPI` 默认 MOSI=P3.2、MISO=P3.3、SCK=P3.4、SS=P3.5，仍使用软件接线；可通过 `setPinsChecked()` 选择完整硬件路由。`SPI1` 对应硬件 SPI2（P6.5/P6.6/P6.7，SS=P6.4），`SPI2` 对应硬件 SPI3（P2.3/P2.4/P2.5，SS=P2.2）；硬件运行依赖有效的 HSIO/PLL 配置。补齐 2～128 分频选项；频率为请求值，未匹配硬件路由或时钟条件时会回退软件 SPI。
- UART1 使用 Timer1，其余 UART 按编号使用对应定时器；`Serial2` 与 `tone()` 的 Timer2 存在冲突。各接口还需避开引脚复用冲突，使用 `configurationError()` 检查初始化结果。以上为配置与源码核对，未做实板通信验证。
- 外部中断仅 P3.2 / INT0、P3.3 / INT1，模式仅 LOW / FALLING。
- `pwmPins` 按 arduino-stc51 0.0.7 的 `cores/STC/wiring_analog_write.c` 路由表与本型号 GPIO 掩码取交集，列出 25 个 `analogWrite()` 可用引脚（仅正向输出）。同一 PWM 通道的不同映射引脚不能同时独立输出；具体可用引脚仍取决于封装。
- 裸芯片无板载 LED，因此 `builtinLed` 为空。
- C++ 需显式选 `cppcore=enabled,clock=12m` 并另外准备受工具锁约束的 stcxx / Clang / LLVM-CBE 环境；Windows 使用 WSL。菜单本身不会安装这些工具。
- 本型号使用实验 MCS251 构建配置。

## 待接入的工具依赖

`boardDependencies` 仅保留已核实存在的 `@aily-project/tool-ctags@5.8.0`。2026-09-07 从主程序使用的 https://registry.yiyu.pro 查询 `@aily-project/sdk-stc51`、`@aily-project/compiler-sdcc-mcs251` 均返回 404；这些候选包名未写为已发布依赖。当前 Aily SDK 打包仓库亦无 STC 平台目录，因此本包暂不承诺新建后能直接编译。

上游 Boards Manager 真实依赖为：

| 组件 | 上游版本 |
| --- | --- |
| arduino-stc51:mcs51 | 0.0.2 |
| sdcc-mcs251 | 4.6.0-mcs251-20260804-r1 |
| MCS51Tools | 2026.07.10 |
| MCS51ArchiveTools | build.13407_4 |

这些是上游组件及版本，并非虚构的 Aily npm 包。Aily 的 SDK/编译器/辅助工具打包和运行时路径映射仍需完成；开发板包自己的版本按要求保持 0.0.1，不把上游核心版本改成 0.0.1。

## 编译与烧录

上游平台没有 upload recipe，本包没有填写 `uploadParam`。上游链接配方直接生成 HEX，Aily 构建目录中的 HEX 可供独立烧录；请按上游 README 使用 stc-cli 或官方 ISP，并核对型号、时钟、执行模式及实验目标限制。芯片级一键上传尚待集成。

## 本轮验证（2026-09-07）

配置生成器已核对全部 20 个 variant、GPIO 掩码、ADC 别名、菜单及默认值。Aily 空白模板实际生成的 C/C++ 源文件经上游原始 BusyBox wrapper 和补丁 SDCC 编译，20 个默认配置均成功生成对象文件；此检查不包含链接、固件运行或实板。

直接使用当前本地 aily-builder 1.2.17 进行完整编译时，预处理能够解析本型号系列的配置，但 STC8G1K08A 冒烟检查在 sketch 编译阶段失败：构建器将上游 shell wrapper 配方改写为 `sdcc ash ...`，报 `error 119: don't know what to do with file ash`。因此还需完成构建器对 STC shell wrapper 的适配；没有把此结果标记为端到端编译通过。
