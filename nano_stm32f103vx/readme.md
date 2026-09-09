# 三只蓝鲸 NANO_STM32F103VX_V520

aily blockly 开发板配置包，面向 **三只蓝鲸 NANO_STM32F103VX V5.20** 开发板。

## 芯片

- 主控：**STM32F103VET6**（兼容 VCT6 / VDT6 / VGT6）
- 内核：Arm Cortex-M3 @ 72 MHz，512 KB Flash，64 KB SRAM，LQFP100（80 个 GPIO）
- FQBN（三段式）：`STMicroelectronics:stm32:GenF1`
- 型号通过 aily 菜单「开发板型号选择」设置，默认 `GENERIC_F103VETX`（编译时以 `--board-options pnum=GENERIC_F103VETX` 传递）

## 板载资源（依据官方 IO 引脚分配表）

| 类别 | 引脚 | 说明 |
|------|------|------|
| LED0 (DS0) | **PB5** | 板载蓝色 LED，低电平点亮 |
| LED1 (DS1) | **PE5** | 板载红色 LED，低电平点亮 |
| KEY0 | **PE4** | 按键（按下为低电平） |
| KEY1 | **PE3** | 按键（按下为低电平） |
| WK_UP | **PA0** | 按键 + 待机唤醒脚（默认高电平，可做普通 IO） |
| BEEP | **PB8** | 无源蜂鸣器（2KHz，不建议做普通 IO） |
| 红外接收 | **PB9** | HS0038 等红外接收模块接口 |
| NTC 热敏 | **PC5** | ADC 采集，B 值 3500 |
| DHT11/DS18B20 | **PD1** | 单总线数据脚（5.1K 上拉） |
| W25Q16 Flash | PB12~PB15 | SPI2：CS=PB12, SCK=PB13, MISO=PB14, MOSI=PB15 |
| SD 卡（SDIO） | PC8~PC12、PD2 | D0~D3、SCK、CMD（10K 上拉） |
| RS485（MAX3485） | PB10/PB11、PE0 | RXD/TXD/RE |
| LCD/OLED | PC6/PC7、PD12~PD15 | DC、BLK、RST、CS、SCL、SDA |
| USB 2.0 | PA11/PA12 | 右 U 口（USB D-/D+） |
| 串口 1 | PA9(TX)/PA10(RX) | 可跳线连接 ST-LINK 虚拟串口 |

## 下载与调试

本板集成 **ST-LINK V2.1**（左 U 口，供电 + 下载 + 调试 + 虚拟串口）和 **CH340**（右 U 口）。

- 默认下载走 **ST-LINK（probe-rs，SWD）**：`probe-rs download --chip STM32F103VE --verify`
- 也支持 **串口 BOOT0 引导**（stm32flash）：短接 BOOT0 后经 CH340 烧录
- 使用 ST-LINK 时，PA13/PA14 为 SWDIO/SWDCLK，若要做普通 IO 需先禁止 JTAG/SWD（会失去仿真能力）

## 引脚使用注意事项

- ⛔ **PC14 / PC15 不可用**：板载 32.768K RTC 晶振占用，IO 表明确标注"不可用做 IO"，已从数字引脚表剔除。
- ⚠️ **PB12~PB15**：接 W25Q16（SPI2），不使用 Flash 时（片选禁止）可做普通 IO。
- ⚠️ **PB8**：接蜂鸣器，调用时蜂鸣器同步受控。
- ⚠️ **PA11/PA12**：接 USB，不使用右 U 口时完全独立。
- ⚠️ **PA15、PB3、PB4**：JTAG 口，做普通 IO 需先禁止 JTAG（可保留 SWD 仿真）。
- ⚠️ **PB5 / PE5**：接 LED，仅建议做输出。
- ✅ 其余未接外设的 IO（如 PA1~PA8、PC0~PC4、PD3~PD11、PE1~PE2、PE6~PE15 等）完全独立，可放心使用。

## 外设能力

| 功能 | 引脚 |
|------|------|
| ADC 模拟输入 | PA0~PA7、PB0/PB1、PC0~PC5 |
| PWM / 舵机 | PA0~3、PA6~11、PA15、PB0/1、PB3~11、PB13~15、PC6~9、PD12~15、PE8~14 |
| 串口 | Serial(USART1: PA9/10)、Serial2(USART2: PA2/3)、Serial3(USART3: PB10/11)、Serial4(UART4: PC10/11)、Serial5(UART5: PC12/PD2) |
| SPI | SPI(PA4~7)、SPI2(PB12~15)、SPI3(PA15/PB3~5) |
| I2C | Wire(I2C1: PB6/7)、Wire1(I2C2: PB10/11) |
| 外部中断 | 全部 78 个可用 GPIO |

## FastLED / WS2812 灯带注意事项（重要）

FastLED 库的 STM32F1 引脚表只支持**数字引脚号 0~36**（即 PA8~PA15、PB2~PB15）。而本板的 PA0~PA7、PB0/PB1、PC0~PC5 在 STM32duino 变体中被编为**模拟引脚号（PIN_A0=192 起）**，FastLED 无法识别。

- ✅ **可用作 WS2812/FastLED 数据脚**：PA8~PA15、PB2~PB15（其中 PA8、PB2 完全空闲，推荐使用；PA9/PA10 占用串口、PB5 为 LED0、PB8 为蜂鸣器、PB9 为红外、PB12~15 为 W25Q16、PB6/7 为 I2C，需注意占用）
- ⛔ **不可用于 FastLED**：PA0~PA7、PB0/PB1、PC0~PC5（模拟引脚号，超出 FastLED 支持范围，编译报 "This pin has been marked as an invalid pin"）
- 在 aily 的「初始化RGB灯带」积木中，请从上述 ✅ 引脚里选择数据脚（例如 PA8）。

## 使用说明（本地开发调试）

1. 打开 aily blockly，进入「菜单 > 设置 > 开发者模式」。
2. 将本目录（`nano_stm32f103vx`）复制到任意位置，例如 `D:\nano_stm32f103vx`。
3. 在 aily blockly 中新建项目，打开终端执行本地安装：
   ```
   npm i D:\nano_stm32f103vx
   ```
4. 在「项目管理」中点击 🔁 图标重新加载项目，即可在开发板列表看到 `NANO_STM32F103VX_V520`。

## 提交官方仓库

1. Fork `https://github.com/ailyProject/aily-blockly-boards`
2. 将 `nano_stm32f103vx` 文件夹放入仓库根目录
3. 提交 Pull Request（CI 会自动运行 `boards-compliance` 校验）
4. 合并后由官方发布到 npm，所有用户即可使用

## 合规自查

- ✅ 板依赖唯一、名称小写、版本一致（板 2.12.0 == template 2.12.0 == sdk-stm32 2.12.0）
- ✅ board 字段 == nickname（NANO_STM32F103VX_V520）
- ✅ 必填字段：name / version / description / nickname / brand 齐全
