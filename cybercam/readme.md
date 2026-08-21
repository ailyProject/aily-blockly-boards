# CyberCAM

CyberCAM is a Python-only AI camera board from 01Studio based on the K230. This package selects the `canmv-k230` runtime adapter and uses `main.py` as the project entry file.

## Runtime contract

| Setting | Value |
| --- | --- |
| Project mode | Python |
| Runtime adapter | `canmv-k230` |
| Temporary-run transport | CanMV USBDBG |
| Output | Backend `scriptOutput` event stream |
| Input | CanMV REPL input |
| Stop | Device interrupt |
| Remote files | CanMV IO protocol |
| Entry file | `main.py` |

The desktop application sends generated Python to the CanMV backend with `runScript`. The backend returns lifecycle state through `scriptState`, terminal text through `scriptOutput`, and preview JPEG frames through `frame`. Stop is sent to the device rather than implemented by killing a local Python process.

USB discovery uses VID/PID `1209:abd1`. A real CyberCAM K230 was detected with these identifiers and successfully exercised through detect, connect, temporary run, output/state events, root-directory listing, firmware query, stop, and disconnect.

## Autostart deployment

CyberCAM's Debian image executes shell scripts placed in `/boot/start/` during startup. A typical deployment stores the Python program in `/home/pi` and creates a shell script such as:

```sh
#!/bin/sh
python3 -u /home/pi/main.py &
```

The trailing `&` is required for a long-running program so that the startup script does not block other system services. This package records that behavior as a `boot-start-sh` deployment profile. The current desktop adapter implements temporary CanMV execution and remote file operations; a guided one-click autostart installer is a separate future UI feature.

## Board capabilities

`board.json` declares the fixed onboard camera, display, touch, audio input/output, IMU, wireless, GPIO, PWM, UART, I2C, and SPI capabilities.

| Capability | Assignment |
| --- | --- |
| General GPIO | GPIO11, GPIO12, GPIO14, GPIO15, GPIO16, GPIO17, GPIO60, GPIO61 |
| User LED | GPIO52 |
| User key | GPIO21 |
| Fill light | GPIO46 / PWM2 |
| Passive buzzer | GPIO47 / PWM3 |
| PWM0 | GPIO60 |
| PWM1 | GPIO61 |
| UART2 | TX GPIO11, RX GPIO12 |
| I2C2 | SCL GPIO11, SDA GPIO12 |
| Onboard IMU (I2C1) | SCL GPIO40, SDA GPIO41 |
| SPI0 | CS0 GPIO14, SCLK GPIO15, MOSI GPIO16, MISO GPIO17 |

GPIO11 and GPIO12 are shared by UART2 and I2C2. GPIO14 through GPIO17 are shared with SPI0. Configure only one conflicting peripheral function at a time.

The onboard camera, display, and audio paths use fixed internal interfaces. Their `pins` maps are intentionally empty because 01Studio does not document them as selectable GPIO mappings. ADC0 and ADC1 are documented as 0–3.6 V solder pads without GPIO numbers, so the package does not expose guessed analog-pin identifiers.

The official audio documentation identifies the ALSA card as `K230I2SINNO` and the device as `Audio 9140e000.inno codec-0`. It does not establish a selectable GPIO mapping or a standalone codec-chip model, so `audioConfig.pins` remains empty and the package does not claim an undocumented codec.

## Sources

- [01Studio CyberCAM product documentation](https://github.com/01studio-lab/01studio_wiki/blob/main/docs/cybercam/intro/product.md)
- [01Studio CyberCAM GPIO documentation](https://github.com/01studio-lab/01studio_wiki/blob/main/docs/cybercam/basic_examples/gpio_intro.md)
- [01Studio CyberCAM camera documentation](https://github.com/01studio-lab/01studio_wiki/blob/main/docs/cybercam/machine_vision/camera.md)
- [01Studio CyberCAM audio documentation](https://github.com/01studio-lab/01studio_wiki/blob/main/docs/cybercam/os_software/audio.md)
- [01Studio CyberCAM autostart documentation](https://wiki.01studio.cc/docs/cybercam/os_software/auto_run)

`board.webp` is cropped and resized from the official CyberCAM product image. Attribution and the complete upstream image license are included in `LICENSE.image.txt`.
