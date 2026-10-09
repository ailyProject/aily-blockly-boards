# AI8051U-34K64

Aily 开发板包版本 **0.0.1**，状态 **todo**。配置取自 arduino-stc51 0.0.2 当前源码，尚未完成 Aily 工具链安装、端到端编译或实板验证。

## 配置依据

- 上游：[arduino-stc51](https://github.com/coloz/arduino-stc51)，FQBN：`arduino-stc51:mcs51:ai8051u_34k64`。
- 型号与资源：`tools/variants/devices.json`、`boards.txt`。
- 引脚：`variants/AI8051U_34K64/pins_arduino.h` 和 `variants/_common/pins_arduino_common.h`。
- [原厂型号资料](https://www.stcmicro.com/datasheet/Ai8051U_Features.pdf)。
- 46 个逻辑 GPIO，15 个模拟输入。引脚值使用上游 `P3_2` 等宏；底层编码为 `(port << 4) | bit`，不是连续数字。
- 裸芯片配置列出 variant 的最大逻辑引脚集合；具体封装可能引出更少的引脚。图片为代表封装示意，不能代替封装引脚图。
- 物理焊盘复用：P4.4 / P4.5。这些逻辑名称不能当作独立物理引脚。

## 默认模板与功能边界

模板采用 `clock=24m,memory=large,cppcore=plain,execution=mcs51`，与上游默认构建参数一致。空白工作区生成 `#include <Arduino.h>`、`void setup() {}`、`void loop() {}`，属于该核心接受的 C 语法。时钟菜单必须与 ISP 设置的真实时钟一致；core 不会自动切换系统时钟。

模板只加载基础 IO、逻辑、循环、数学和时间库，保留仓库已有库版本。没有把依赖 String / Print 重载的文本和通用串口库预装到纯 C 模板；基础库中的扩展积木仍需逐项验证，尤其不要将 C++ 重载、函数引用或随机数双参数调用当作纯 C 已兼容。

- 通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对：提供 `Serial` 及 `Serial1`～`Serial4`，`serialPins` 记录各硬件串口的默认 RX/TX。`Serial` 由 USB CDC 菜单选择 UART1 或 USB CDC；`Serial1` 始终为 UART1。
- `Wire` 保留软件主机默认 SDA=P3.2、SCL=P3.3；硬件从机默认 SDA=P3.3、SCL=P3.2。IIC 需要外部上拉。
- `SPI` 默认 MOSI=P3.2、MISO=P3.3、SCK=P3.4、SS=P3.5，仍使用软件接线；可通过 `setPinsChecked()` 选择完整硬件路由。硬件 SPI 默认数据组为 P1.5/P1.6/P1.7，不能与 STC32 的 P1.3/P1.4/P1.5 混用。补齐 2～128 分频选项；频率为请求值，未匹配硬件路由或时钟条件时会回退软件 SPI。
- UART1 使用 Timer1，其余 UART 按编号使用对应定时器；`Serial2` 与 `tone()` 的 Timer2 存在冲突。各接口还需避开引脚复用冲突，使用 `configurationError()` 检查初始化结果。以上为配置与源码核对，未做实板通信验证。
- 外部中断仅 P3.2 / INT0、P3.3 / INT1，模式仅 LOW / FALLING。
- `pwmPins` 按 arduino-stc51 0.0.7 的 `cores/STC/wiring_analog_write.c` 路由表与本型号 GPIO 掩码取交集，列出 28 个 `analogWrite()` 可用引脚（仅正向输出）。同一 PWM 通道的不同映射引脚不能同时独立输出；具体可用引脚仍取决于封装。
- 裸芯片无板载 LED，因此 `builtinLed` 为空。
- C++ 需显式选 `cppcore=enabled,clock=12m` 并另外准备受工具锁约束的 stcxx / Clang / LLVM-CBE 环境；Windows 使用 WSL。菜单本身不会安装这些工具。
- AI8051U 的 execution 菜单只切换编译目标；实际芯片执行模式必须另用官方 ISP 设置一致。

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
