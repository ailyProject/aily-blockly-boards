# Raspberry Pi

Raspberry Pi Linux Python board. This package selects the `linux-ssh` runtime adapter and uses `main.py` as the project entry file.

This is **not** Raspberry Pi Pico. Pico remains `@aily-project/board-raspberrypi_pico` and uses the RP2040 Arduino/UF2 toolchain.

## Runtime contract

| Setting | Value |
| --- | --- |
| Project mode | Python |
| Runtime adapter | `linux-ssh` |
| Temporary-run transport | SSH PTY |
| Output | Combined PTY stream |
| Input | PTY |
| Stop | Process group with token + starttime |
| Remote files | SFTP |
| Autostart | systemd unit `aily-<project>.service` |
| Entry file | `main.py` |

The desktop application connects only to a user-provided SSH host. It does not scan the LAN.

## Libraries

New projects install:

- `@aily-project/lib-python-core` — portable CPython language, OpenCV, files, and network blocks
- `@aily-project/lib-linux-python` — gpiozero, pyserial, and OpenCV `VideoCapture` hardware blocks

`@aily-project/lib-cybercam` stays on CyberCAM. Its camera, display, KPU, `board`/`digitalio`, and `periphery` PWM APIs are CanMV/K230 contracts, not generic CPython.

## Sources

- [Raspberry Pi documentation](https://www.raspberrypi.com/documentation/)

`board.webp` is a temporary placeholder copied from the Pico board package. See `LICENSE.image.txt`.
