# ESP32P4 Robot-Lite V1.1

本包使用 Arduino-ESP32 3.3.11 的通用目标：

```text
esp32:esp32:esp32p4
```

## 已配置

- P4 电源域：VO1 3.3 V、VO2 1.8 V、VO3 2.5 V、VO4 3.3 V。
- C6 ESP-Hosted SDIO：CLK 47、CMD 48、D0 46、D1 45、D2 44、D3 43、RESET 42；GPIO41 作为 C6 启动相关保留脚，不主动驱动。
- 音频总线：I2C SDA 21/SCL 20；I2S MCLK 33、SCLK 34、LRCK 37、ASDOUT 36、DSDIN 38；PA_MUTE 40。
- UART1：TX 10、RX 11；USB CDC 可作为 `Serial`。
- SPI 是通用 P4 软件可重映射默认值：SS 4、SCK 5、MISO 6、MOSI 7，不代表板载固定连线。

模板默认安装 Robot-Lite 专用 Hosted 初始化库、ES8311 和 ESP32 I2S。专用初始化积木会先保持四路 LDO，再把 Hosted SDIO 切换到本板引脚。

## 验证等级

- 通用 P4 FQBN 的基础、WiFi、BLE、ES8311、I2S 以及 Blockly 生成代码均已编译通过。
- 尚未在 Robot-Lite V1.1 实机上传或验证 C6 固件、SDIO 信号、电源时序和音频链路。
- 现有库没有 ES7243E 初始化和声学回声消除实现，这两项未宣称支持。

开发板图片使用项目已有的 ESP32-P4 + C6 通用图标，没有使用来源不明的实物图片。
