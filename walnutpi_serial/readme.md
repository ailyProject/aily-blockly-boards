# WalnutPi Serial

Independent WalnutPi Linux Python board over SERIAL-A. This package selects the `linux-serial-shell` runtime adapter and uses `main.py` as the project entry file.

This is **not** CyberCAM K230. CyberCAM remains `@aily-project/board-cybercam` and uses `canmv-k230`. For networked WalnutPi boards, use `@aily-project/board-walnutpi`.

## Runtime contract

| Setting | Value |
| --- | --- |
| Project mode | Python |
| Runtime adapter | `linux-serial-shell` |
| Temporary-run transport | User-selected SERIAL-A shell |
| Output | Combined PTY stream |
| Input | PTY |
| Stop | Process group with token + starttime |
| Remote files | Framed serial transfer |
| Autostart | `/boot/start/aily-<project>.sh` |
| Entry file | `main.py` |

The desktop application only opens the COM port the user selects. Enumerated ports are not opened automatically.

## Libraries

New projects install:

- `@aily-project/lib-python-core`
- `@aily-project/lib-linux-python`

Do not install `@aily-project/lib-cybercam` on this board.

`board.webp` is a temporary placeholder. See `LICENSE.image.txt`.
