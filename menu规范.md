# `menu.json` 配置规范

本文档定义 Aily Blockly 开发板包根目录中 `menu.json` 及配套 `i18n` 文件的格式、与 Arduino SDK `boards.txt` 的映射关系，以及当前主程序支持的扩展行为。

文档中的关键词含义如下：

- **必须**：不满足时配置无法正确加载，或会产生错误结果。
- **应**：推荐遵守；只有明确理由时才应偏离。
- **可**：按开发板需求选择使用。

## 1. 文件位置

`menu.json` 必须直接放在开发板包根目录下；多语言文件放在开发板包根目录的 `i18n` 目录中，不放入 `config` 目录。

```text
<board-package>/
├─ board.json
├─ package.json
├─ menu.json
├─ i18n/
│  ├─ en.json
│  ├─ zh_cn.json
│  ├─ zh_hk.json
│  └─ ...
└─ template/
```

`menu.json` 是可选文件。开发板包中不存在该文件时，主程序不会显示该开发板的附加配置菜单。

## 2. 配置来源和映射关系

### 2.1 确定 `boards.txt` 中的开发板 ID

主程序从 `board.json.type` 的最后一段取得 `boards.txt` 中的开发板 ID。

例如：

```json
{
  "type": "esp32:esp32:esp32"
}
```

对应的开发板 ID 是 `esp32`，因此主程序查找的配置前缀为：

```text
esp32.menu.<menu-id>.<option-id>
```

`board.json.type` 最后一段必须与 SDK `boards.txt` 中使用的开发板 ID 完全一致，包括大小写。

### 2.2 `menu.json.key` 对应 Arduino 菜单 ID

假设 ESP32 SDK 的 `boards.txt` 中包含：

```properties
menu.UploadSpeed=Upload Speed

esp32.name=ESP32 Dev Module
esp32.menu.UploadSpeed.921600=921600
esp32.menu.UploadSpeed.921600.upload.speed=921600
esp32.menu.UploadSpeed.115200=115200
esp32.menu.UploadSpeed.115200.upload.speed=115200
```

开发板包中的声明应为：

```json
[
  {
    "sep": true
  },
  {
    "name": "ESP32.UPLOAD_SPEED",
    "icon": "fa-light fa-up-from-line",
    "children": [],
    "key": "UploadSpeed"
  }
]
```

映射规则如下：

| Aily 字段 | `boards.txt` 来源 | 示例结果 |
| --- | --- | --- |
| 开发板 ID | `board.json.type` 最后一段 | `esp32` |
| `menu.json[].key` | Arduino 菜单 ID | `UploadSpeed` |
| 子选项 `data` | `<option-id>` | `921600` |
| 子选项 `name` | `<board-id>.menu.<menu-id>.<option-id>` 的值 | `921600` |
| 编译参数 | 当前项目选中的 `key=data` | `--board-options UploadSpeed=921600` |

主程序按以下格式读取选项：

```text
<board-id>.menu.<menu.json key>.<option-id>=<option-name>
```

因此：

- `key` 必须与 `boards.txt` 中的菜单 ID 完全一致，包括大小写。
- 选项列表及顺序应由当前 SDK 的 `boards.txt` 决定，不应复制并写死到 `menu.json`。
- 对于动态菜单，`children` 应写为空数组 `[]`。
- `menu.<menu-id>=...` 这一全局标题不会被主程序用作菜单标题；顶层标题由 `name` 指定的 i18n 键提供。
- `boards.txt` 中选项下的 `build.*`、`upload.*` 等属性仍由 Arduino 构建系统根据 `--board-options` 处理，无需复制到 `menu.json`。

### 2.3 选中值的保存与编译

用户选择菜单项后，主程序将选项保存到当前项目的 `package.json`：

```json
{
  "projectConfig": {
    "UploadSpeed": "921600",
    "FlashMode": "dio"
  }
}
```

编译时，每个非空配置会转换为 Arduino CLI 参数：

```text
--board-options UploadSpeed=921600 --board-options FlashMode=dio
```

因此，`data` 必须是 `boards.txt` 中真实存在的 `<option-id>`，不能使用选项显示名称代替。

## 3. `menu.json` 根结构

文件必须是合法 UTF-8 JSON，根节点必须是数组：

```json
[
  {
    "sep": true
  },
  {
    "name": "VENDOR.MENU_TITLE",
    "icon": "fa-light fa-microchip",
    "children": [],
    "key": "MenuId"
  }
]
```

JSON 中不能包含注释、尾随逗号、`undefined` 或其他非 JSON 内容。

## 4. 顶层菜单项字段

### 4.1 常规字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sep` | `boolean` | 否 | 为 `true` 时表示分隔线。分隔线项不应再填写其他配置字段。 |
| `name` | `string` | 配置项必填 | 顶层菜单标题的 i18n 键，例如 `ESP32.UPLOAD_SPEED`。 |
| `key` | `string` | 配置项必填 | `boards.txt` 中的菜单 ID，也是项目 `projectConfig` 的键。大小写敏感。 |
| `icon` | `string` | 否 | Font Awesome 图标类名，例如 `fa-light fa-memory`。 |
| `children` | `array` | 应填写 | 动态读取 `boards.txt` 时写 `[]`。只有 SDK 中没有对应动态选项时，才使用静态子项作为后备。 |
| `extra` | `object` | 否 | Aily 扩展行为，详见第 6 节。 |
| `data` | 任意 JSON 值 | 否 | 顶层配置项当前不会使用该值，新配置应省略。 |

以下运行时字段不应写入开发板包的 `menu.json`：

- `check`：主程序根据 `projectConfig` 自动计算。
- 子项的继承 `key`：主程序会从顶层配置项自动补充。
- 从 `boards.txt` 提取的动态选项：主程序会自动生成。

### 4.2 静态 `children` 后备格式

对于没有对应 `boards.txt` 菜单的特殊 SDK，可提供静态子项：

```json
{
  "name": "VENDOR.SPECIAL_MODE",
  "key": "SpecialMode",
  "children": [
    {
      "name": "Mode A",
      "data": "mode_a"
    },
    {
      "name": "Mode B",
      "data": "mode_b"
    }
  ]
}
```

静态子项字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 子菜单直接显示的文本。当前子菜单不会对该字段再执行 i18n 翻译。 |
| `data` | `string` | 是 | 保存到 `projectConfig` 并传给 `--board-options` 的选项 ID。 |
| `key` | `string` | 否 | 省略时继承父项 `key`。 |
| `extra` | `object` | 否 | 子项扩展配置；与父项 `extra` 合并，同名字段以子项为准。 |

如果 `boards.txt` 中找到了同一 `key` 的动态选项，动态选项会整体替换静态 `children`。Arduino 兼容 SDK 应优先以 `boards.txt` 为唯一选项来源。

## 5. i18n 规范

### 5.1 文件名

当前主程序语言代码如下：

```text
en, zh_cn, zh_hk, ar, de, es, fr, ja, ko, pt, ru
```

文件名必须与语言代码完全一致，例如：

```text
i18n/en.json
i18n/zh_cn.json
i18n/ja.json
```

应至少提供 `i18n/en.json` 作为后备语言，并应为全部支持语言提供相同的翻译键。

### 5.2 文件内容

如果 `menu.json` 使用以下名称：

```json
{
  "name": "ESP32.UPLOAD_SPEED"
}
```

则 `i18n/zh_cn.json` 应包含：

```json
{
  "ESP32": {
    "UPLOAD_SPEED": "烧录速度"
  }
}
```

`i18n/en.json` 应包含：

```json
{
  "ESP32": {
    "UPLOAD_SPEED": "Upload Speed"
  }
}
```

规则如下：

- i18n 文件根节点必须是 JSON 对象，不能是数组。
- `name` 等板卡专用翻译键应由当前开发板包的 `i18n` 文件提供；`extra.selectPortMessage` 可复用主程序已有的通用键（例如 `SERIAL.SELECT_PORT_FIRST`），自定义提示则应由板包 i18n 提供。
- 翻译对象会合并到主程序当前语言中，因此命名空间应清晰，例如 `ESP32`、`STM32`、`NRF5` 或厂商专属前缀。
- 当前语言文件不存在或解析失败时，主程序尝试加载 `en.json`。
- 如果当前语言文件存在，主程序不会再额外加载该板包的英文文件来补齐缺失键，因此各语言文件应保持键集合一致。
- 从 `boards.txt` 生成的子选项名称直接使用 SDK 提供的文本，当前不会通过板包 i18n 翻译。

## 6. `extra` 扩展字段

`extra` 中的字段不是 Arduino `boards.txt` 标准，而是 Aily Blockly 的运行时扩展。只应使用本节列出的字段；新增动作需要主程序先实现对应处理逻辑。

| 字段 | 类型 | 作用 | 使用注意 |
| --- | --- | --- | --- |
| `optionNameIncludes` | `string` | 只保留选项名称中包含指定文本的项。 | 使用大小写敏感的字符串包含匹配；过滤发生在读取 `boards.txt` 之后。 |
| `selectFirstByDefault` | `boolean` | 项目尚未保存该 `key` 时，自动选中过滤后的第一个选项并写入 `projectConfig`。 | 第一个选项由 `boards.txt` 顺序决定。 |
| `syncPinConfig` | `boolean` | 选择后根据选项的 `build.variant`/`build.variant_h` 读取 SDK variant 头文件，并同步 `board.json` 中的引脚数组。 | 主要用于 STM32 通用板型选择；必须确认 SDK variant 文件存在。 |
| `refreshRuntimeBoardConfig` | `boolean` | 选择后立即重新解析并刷新主程序内存中的开发板配置。 | 当前用于 ESP32 `CDCOnBoot` 等会改变运行时串口定义的配置。 |
| `selectAction` | `string` | 选择后执行 Aily 自定义动作。 | 当前仅支持 `flash-softdevice`。不要填写未实现的动作名。 |
| `selectPortMessage` | `string` | 执行需要串口的自定义动作但尚未选择串口时显示的 i18n 键。 | 当前与 `selectAction: "flash-softdevice"` 配合使用。 |

父项 `extra` 会复制到所有动态子项；如果静态或动态子项已有同名 `extra` 字段，则子项值优先。

### 6.1 STM32 板型选择示例

```json
{
  "name": "STM32.BOARD",
  "icon": "fa-light fa-microchip",
  "children": [],
  "key": "pnum",
  "extra": {
    "optionNameIncludes": "Generic",
    "selectFirstByDefault": true,
    "syncPinConfig": true
  }
}
```

该配置会读取：

```text
<board-id>.menu.pnum.<option-id>=<option-name>
<board-id>.menu.pnum.<option-id>.build.variant=...
<board-id>.menu.pnum.<option-id>.build.variant_h=...
```

然后只显示名称包含 `Generic` 的板型；项目没有 `pnum` 配置时选中第一项，并根据对应 variant 同步引脚。

### 6.2 ESP32 运行时刷新示例

```json
{
  "name": "ESP32.CDC_ON_BOOT",
  "icon": "fa-brands fa-usb",
  "children": [],
  "key": "CDCOnBoot",
  "extra": {
    "refreshRuntimeBoardConfig": true
  }
}
```

### 6.3 nRF5 SoftDevice 动作示例

```json
{
  "name": "NRF5.SOFTDEVICE",
  "icon": "fa-light fa-microchip",
  "children": [],
  "key": "softdevice",
  "extra": {
    "selectAction": "flash-softdevice",
    "selectPortMessage": "SERIAL.SELECT_PORT_FIRST"
  }
}
```

该选项仍从 `<board-id>.menu.softdevice.*` 动态读取。用户选择后，除保存 `projectConfig.softdevice` 外，主程序还会通过当前串口烧录对应 SoftDevice。

## 7. 推荐完整示例

### 7.1 `menu.json`

```json
[
  {
    "sep": true
  },
  {
    "name": "ESP32.UPLOAD_SPEED",
    "icon": "fa-light fa-up-from-line",
    "children": [],
    "key": "UploadSpeed"
  },
  {
    "name": "ESP32.FLASH_MODE",
    "icon": "fa-light fa-tablet-rugged",
    "children": [],
    "key": "FlashMode"
  },
  {
    "name": "ESP32.CDC_ON_BOOT",
    "icon": "fa-brands fa-usb",
    "children": [],
    "key": "CDCOnBoot",
    "extra": {
      "refreshRuntimeBoardConfig": true
    }
  }
]
```

### 7.2 `i18n/en.json`

```json
{
  "ESP32": {
    "UPLOAD_SPEED": "Upload Speed",
    "FLASH_MODE": "Flash Mode",
    "CDC_ON_BOOT": "USB CDC on Boot"
  }
}
```

### 7.3 `i18n/zh_cn.json`

```json
{
  "ESP32": {
    "UPLOAD_SPEED": "烧录速度",
    "FLASH_MODE": "闪存模式",
    "CDC_ON_BOOT": "USB 模拟串口"
  }
}
```

## 8. 加载流程

项目加载后的处理顺序如下：

1. 主程序定位当前项目安装的开发板包。
2. 检查开发板包根目录是否存在 `menu.json`。
3. 解析根数组，并记录板包根目录下的 `i18n` 路径。
4. 加载当前语言文件；文件不存在或无效时尝试 `en.json`。
5. 从 `board.json.type` 取得开发板 ID，并读取该 SDK 的 `boards.txt`。
6. 对每个带 `key` 的菜单项，读取 `<board-id>.menu.<key>.*` 并生成子选项。
7. 应用 `optionNameIncludes`、默认选择及当前选中状态。
8. 将生成的配置菜单加入主界面的开发板/端口菜单。
9. 用户选择后写入项目 `package.json.projectConfig`，执行声明的扩展行为，并触发重新预处理。
10. 编译时把 `projectConfig` 转换为 `--board-options key=value`。

切换主程序语言时，当前开发板包的 i18n 文件会重新加载。

## 9. 错误与边界行为

- `menu.json` 不存在：正常情况，不显示附加菜单。
- JSON 语法错误或根节点不是数组：整个板包菜单加载失败，主程序控制台输出警告。
- i18n 文件缺失：尝试英文文件；英文也不存在时，界面可能直接显示翻译键。
- i18n 根节点不是对象：该语言文件被忽略，并尝试英文文件。
- `board.json.type` 与 `boards.txt` 开发板 ID 不一致：无法找到动态选项。
- `key` 在当前开发板的 `boards.txt` 中不存在，且 `children` 为空：该菜单项没有可选项，不会显示为有效配置菜单。
- `optionNameIncludes` 过滤掉全部选项：该菜单项没有可选项。
- `projectConfig` 中保存了已从新版 SDK 删除的选项 ID：菜单中不会出现选中项；应清理或迁移该旧值。
- 主程序当前使用严格相等比较选中值，因此选项 ID 应统一使用字符串，不要混用数字和字符串。
- 自定义 `selectAction` 不会自动执行任意脚本；只有主程序明确支持的动作才有效。

## 10. 编写步骤

1. 从 `board.json.type` 确认开发板 ID。
2. 在开发板包依赖的实际 SDK `boards.txt` 中查找该开发板 ID。
3. 列出需要向用户开放的 `<board-id>.menu.<menu-id>.*` 菜单。
4. 将每个 `<menu-id>` 原样写入 `menu.json[].key`。
5. 为每个顶层菜单项定义稳定、带命名空间的 `name` 翻译键。
6. 在 `i18n/en.json` 和全部支持语言文件中添加相同键集合。
7. 只有确实需要时才添加 `extra`，并确认其适用条件。
8. 按第 11 节进行静态检查和实际项目验证。

## 11. 验收清单

### 11.1 静态检查

- [ ] `menu.json` 位于开发板包根目录。
- [ ] `i18n` 位于开发板包根目录，文件名使用主程序语言代码。
- [ ] 所有 JSON 文件均为 UTF-8 且可正常解析。
- [ ] `menu.json` 根节点是数组。
- [ ] 每个配置项的 `name`、`key` 完整。
- [ ] 每个 `key` 与当前 SDK `boards.txt` 中的菜单 ID 完全一致。
- [ ] `board.json.type` 最后一段与 `boards.txt` 开发板 ID 一致。
- [ ] 所有语言文件键集合一致，至少存在 `en.json`。
- [ ] 未填写主程序不支持的 `extra` 字段或自定义动作。

PowerShell JSON 解析检查示例：

```powershell
$boardPackagePath = "D:\Git\aily-project\aily-blockly-boards\esp32"

Get-Content -Raw -Encoding UTF8 "$boardPackagePath\menu.json" |
  ConvertFrom-Json | Out-Null

Get-ChildItem "$boardPackagePath\i18n\*.json" | ForEach-Object {
  Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json | Out-Null
}
```

检查 `boards.txt` 中是否存在对应菜单：

```powershell
rg -n "^esp32\.menu\.UploadSpeed\." `
  "C:\Users\coloz\AppData\Local\aily-project\sdk\esp32_3.3.10\boards.txt"
```

### 11.2 主程序验证

- [ ] 新建或打开使用该开发板包的真实项目。
- [ ] 项目加载后能看到声明的配置菜单。
- [ ] 菜单选项名称、数量及顺序与当前 SDK `boards.txt` 一致。
- [ ] 切换语言后顶层菜单标题正确更新。
- [ ] 选择任一选项后，项目 `package.json.projectConfig` 保存正确的 `key` 和选项 ID。
- [ ] 重新打开项目后，当前选中项正确恢复。
- [ ] 实际编译日志包含预期的 `--board-options key=value`。
- [ ] 使用 `extra` 时，对应的运行时刷新、引脚同步或 SoftDevice 烧录行为已实际验证。

## 12. 维护原则

- SDK 升级后，应重新核对新版 `boards.txt` 中菜单 ID、选项 ID和顺序是否变化。
- 同一系列开发板可以复用相同结构，但必须以各自 `board.json.type` 对应的 `boards.txt` 内容为准。
- `menu.json` 只声明需要暴露的菜单及 Aily 扩展行为，不复制 Arduino SDK 的完整选项数据。
- Arduino 菜单选项及其构建属性以 SDK `boards.txt` 为唯一事实来源。
- 板卡专用菜单标题和提示文案放在板包 `i18n` 中，不再写死到主程序配置文件。
