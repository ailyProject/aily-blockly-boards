# WalnutPi

Independent WalnutPi Linux Python board. This package selects the `linux-ssh` runtime adapter and uses `main.py` as the project entry file.

This is **not** CyberCAM K230. CyberCAM remains `@aily-project/board-cybercam` and uses `canmv-k230`.

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
| Autostart | `/boot/start/aily-<project>.sh` |
| Entry file | `main.py` |

The desktop application connects only to a user-provided SSH host. It does not scan the LAN.

WalnutPi images that expose `/boot/start` use the boot-start script path. Capability probe may still report systemd; this package records the WalnutPi image default seen on WalnutPi-2b.

## Libraries

New projects install:

- `@aily-project/lib-python-core` — portable CPython language, OpenCV, files, and network blocks
- `@aily-project/lib-linux-python` — gpiozero, pyserial, and OpenCV `VideoCapture` hardware blocks

Do not install `@aily-project/lib-cybercam` on this board. Its camera, display, and AI blocks call `walnutpi.Sensor`, `walnutpi.Display`, and `walnutpi.kpu`, which belong to the CyberCAM CanMV image, not independent WalnutPi Debian CPython.

Use `walnutpi_serial` when the board is only reachable over SERIAL-A.

`board.webp` is a temporary placeholder. See `LICENSE.image.txt`.
