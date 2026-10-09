# Seekfree AI8051U 核心板

逐飞 AI8051U-34K64（LQFP48）核心板配置，硬件依据为 V1.0.2 原理图。包版本 `0.0.2`，使用 `@aily-project/sdk-mcs251@0.0.2`，FQBN 为 `stc:mcs251:ai8051u_34k64`。状态为 `alpha`，尚未进行实板烧录与运行验证。

## 硬件与引脚

- MCU 供电为 3.3 V，Flash 为 64 KB；板载 40 MHz 晶振、USB 转串口电路和蓝色用户 LED。
- 配置提供 43 个数字引脚、15 个 ADC 输入和 28 个 SDK `analogWrite()` 路由引脚。引脚值使用 `P0_0` 等 SDK 宏，不能用连续编号代替。
- 按板上丝印使用 `P4_5`，不重复列出与它共用物理焊盘的 `P4_4`。
- `P5_6` / `P5_7` 虽引出到排针，但已接板载晶振，因此不列入通用数字引脚。RST 排针用于板上断电复位电路，不是额外的 GPIO。
- 蓝色 LED 接 `P5_2`，低电平点亮。`builtinLed` 直接返回 `P5_2`；芯片级 SDK 的 `LED_BUILTIN` 仍为 `NOT_A_PIN`，手写代码请使用 `P5_2`。
- 同一 PWM 通道的多个路由不能同时作为独立 PWM 通道使用。

| 接口 | 当前 SDK 的默认引脚 |
| --- | --- |
| UART1 / `Serial` | RX=P3.0，TX=P3.1，连接板载 USB 转串口电路 |
| UART1 / `Serial1` | RX=P3.0，TX=P3.1；关闭 CDC 时与 `Serial` 是同一串口 |
| UART2 / `Serial2` | RX=P1.2，TX=P1.3 |
| UART3 / `Serial3` | RX=P0.0，TX=P0.1 |
| UART4 / `Serial4` | RX=P0.2，TX=P0.3 |
| 软件 I²C / `Wire` | SDA=P3.2，SCL=P3.3 |
| 软件 SPI / `SPI` | MOSI=P3.2，MISO=P3.3，SCK=P3.4，SS=P3.5 |
| 外部中断 | P3.2 / INT0、P3.3 / INT1；LOW、FALLING |

默认 I²C、SPI 和外部中断共用部分引脚，不能同时占用同一引脚。

通信配置已按 `sdk-mcs251@0.0.2` 的 `boards.txt`、变体引脚表和驱动核对，补齐硬件串口选项、`serialPins` 和 SPI 的 2～128 分频选项。`Serial` 由 CDC 菜单选择 USB CDC 或 UART1，`Serial1` 始终为 UART1；各 UART 按编号占用对应定时器，`Serial2` 与 `tone()` 的 Timer2 存在冲突。

`Wire` 软件主机保持表中接线；无自定义引脚时，`Wire.begin(address)` 的硬件从机默认改用 SDA=P3.3、SCL=P3.2。IIC 需要外部上拉。`SPI` 也保持表中软件接线，可调用 `SPI.setPinsChecked(PIN_SPI1_MOSI, PIN_SPI1_MISO, PIN_SPI1_SCK, PIN_SPI1_SS)` 切换到硬件默认组 MOSI=P1.5、MISO=P1.6、SCK=P1.7、SS=P1.4。SPI 频率为请求值，是否使用硬件还取决于时钟条件，可通过 `usingHardware()` 查询。本次未做实板通信验证。

## 默认项目与烧录

模板使用当前 SDK 的 MCS251 C++ 核心，默认 `clock=40m,memory=large,cdc=disabled,uploadcheck=manual`。菜单选项由 SDK 的 `boards.txt` 提供；没有沿用旧版本的 `cppcore`、`execution` 选项。

`clock=40m` 对应板载晶振。编译时钟必须与芯片实际时钟一致；该参数本身不会执行逐飞库中的时钟切换代码。首次使用请在 STC-ISP 中核对外部 40 MHz 时钟和 MCS251 执行模式。逐飞的 Keil C251 库不包含在此 Arduino 包中。

Type-C 接口连接的是 USB 转串口芯片，并非 MCU 的原生 USB。模板关闭 USB CDC，使 `Serial` 使用 UART1。V1.0.2 原理图中的桥接芯片为 AI8H2K12U；旧版说明书描述的是 CH340E。

包不覆盖 `uploadParam`，由 Aily 读取 SDK 在 `preprocess.json` 中生成的 `stc-cli` 上传命令，使用 UART、115200 波特率和手动复位。开始上传、等待连接后按板上 RST。SDK 上传目标属于实验支持；AI8051U 默认型号校验选项使用选定型号，并带 `--force-unverified-target`，可在“烧录型号校验”菜单改为要求检测到型号。此选项应与实物型号一致。

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

- [逐飞产品资料及产品图片](https://www.seekfree.com.cn/产品资料/核心板/stc系列/ai8051u核心板/)
- [逐飞官方资料库](https://gitee.com/seekfree/STCAI8051U_Library)：`AI8051U34K64_48P_CoreBoard_V1.0.2.pdf`、`AI8051U核心板说明书（1.1）.pdf`、`Example/Coreboard_Demo/E01_led_demo/user/main.c`。
- [arduino-stc51](https://github.com/coloz/arduino-stc51)：以所依赖 SDK 的 `boards.txt`、`variants/AI8051U_34K64/pins_arduino.h`、`variants/_common/pins_arduino_common.h` 和 `cores/STC/wiring_analog_write.c` 核对菜单及外设映射。
- `board.webp` 以逐飞产品页图片为参考，经图像工具处理为 200×200 透明背景 WebP，USB 接口朝左，板卡居中。

## 验证记录（2026-09-22）

- 仓库开发板规范检查、全部 JSON、11 种语言菜单键、SDK 菜单默认值、GPIO 掩码和 ADC 别名检查通过；索引生成器可发现本包，`npm pack --dry-run` 通过。
- 使用本机 `aily-builder 1.2.17`、`sdk-mcs251 0.0.7`、`compiler-stcxx-toolchain 0.2.0`，按模板默认参数编译并链接测试程序成功，生成 HEX，程序占用 26,290 字节。
- 测试程序包含全部声明的引脚常量、时钟和总线引脚编译期断言，以及 LED、ADC、PWM、外部中断、`Serial` / `String`、`Wire` 和 `SPI` API 调用。
- 预处理结果中的 UART 上传命令已核对。未执行上传；以上结果不代表实板时钟、通信或外设运行测试通过。
