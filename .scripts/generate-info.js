/**
 * info.json 自动生成脚本
 * 从 package.json 和 board.json 中提取信息生成 info.json
 * 
 * 使用方法:
 *   node generate-info.js                    # 生成所有缺失的 info.json
 *   node generate-info.js --all              # 重新生成所有 info.json
 *   node generate-info.js esp32s3            # 只生成指定开发板
 *   node generate-info.js --dry-run          # 预览模式，不实际写入文件
 */

const fs = require('fs');
const path = require('path');

const BOARDS_DIR = path.join(__dirname, '..');

// 需要排除的目录
const EXCLUDE_DIRS = ['node_modules', '.git', '参考', 'archive', 'template'];

// ============ 架构映射表 ============
const ARCHITECTURE_MAP = {
    // AVR
    'arduino:avr': 'avr',
    'arduino:megaavr': 'avr',
    
    // ESP32 系列
    'esp32:esp32': 'xtensa-lx6',
    'esp32:esp32:esp32': 'xtensa-lx6',
    'esp32:esp32:esp32s2': 'xtensa-lx7',
    'esp32:esp32:esp32s3': 'xtensa-lx7',
    'esp32:esp32:esp32c3': 'riscv',
    'esp32:esp32:esp32c6': 'riscv',
    'esp32:esp32:esp32h2': 'riscv',
    'esp32:esp32:esp32p4': 'riscv',
    
    // STM32
    'STMicroelectronics:stm32': 'arm-cortex-m3',  // 默认，具体型号会覆盖
    'STMicroelectronics:stm32:GenF0': 'arm-cortex-m0',
    'STMicroelectronics:stm32:GenF1': 'arm-cortex-m3',
    'STMicroelectronics:stm32:GenF2': 'arm-cortex-m3',
    'STMicroelectronics:stm32:GenF3': 'arm-cortex-m4',
    'STMicroelectronics:stm32:GenF4': 'arm-cortex-m4',
    'STMicroelectronics:stm32:GenF7': 'arm-cortex-m7',
    'STMicroelectronics:stm32:GenG0': 'arm-cortex-m0',
    'STMicroelectronics:stm32:GenG4': 'arm-cortex-m4',
    'STMicroelectronics:stm32:GenH5': 'arm-cortex-m33',
    'STMicroelectronics:stm32:GenH7': 'arm-cortex-m7',
    'STMicroelectronics:stm32:GenL0': 'arm-cortex-m0',
    'STMicroelectronics:stm32:GenL4': 'arm-cortex-m4',
    'STMicroelectronics:stm32:GenC0': 'arm-cortex-m0',
    'STMicroelectronics:stm32:GenWB': 'arm-cortex-m4',
    
    // RP2040
    'rp2040:rp2040': 'arm-cortex-m0+',
    'arduino:mbed_rp2040': 'arm-cortex-m0+',
    
    // SAM (Arduino DUE)
    'arduino:sam': 'arm-cortex-m3',
    
    // SAMD
    'arduino:samd': 'arm-cortex-m0',

    // RENESAS (Arduino UNO R4 系列)
    'arduino:renesas_uno': 'arm-cortex-m4',
    'arduino:renesas_uno:unor4wifi': 'arm-cortex-m4',
    'arduino:renesas_uno:minima': 'arm-cortex-m4',
    'renesas_uno:unor4wifi': 'arm-cortex-m4',
    'renesas_uno:minima': 'arm-cortex-m4',
    
    // nRF52
    'nordic:nrf52': 'arm-cortex-m4',
    
    // GD32
    'GD32:GD32': 'arm-cortex-m4',
};

// ============ MCU 规格数据库 ============
// usbDevice: 原生 USB Device 功能（可模拟 HID 键盘/鼠标、MSC 存储等）
// connectivity: 无线/网络连接能力
const MCU_SPECS = {
    // AVR
    'ATmega328P': { frequency: 16, flash: 32, sram: 2 },
    'ATmega2560': { frequency: 16, flash: 256, sram: 8 },
    'ATmega32U4': { frequency: 16, flash: 32, sram: 2.5, usbDevice: true },  // 原生 USB HID
    'ATmega168': { frequency: 16, flash: 16, sram: 1 },
    
    // ESP32
    'ESP32': { frequency: 240, flash: 4096, sram: 520, connectivity: ['wifi', 'ble', 'bluetooth-classic'] },
    'ESP32-S2': { frequency: 240, flash: 4096, sram: 320, connectivity: ['wifi'], usbDevice: true },  // 原生 USB OTG
    'ESP32-S3': { frequency: 240, flash: 8192, sram: 512, psram: 8192, connectivity: ['wifi', 'ble'], usbDevice: true },  // 原生 USB OTG
    'ESP32-C3': { frequency: 160, flash: 4096, sram: 400, connectivity: ['wifi', 'ble'] },
    'ESP32-C6': { frequency: 160, flash: 4096, sram: 512, connectivity: ['wifi', 'ble', 'zigbee', 'thread'], usbDevice: true },  // USB Serial/JTAG
    'ESP32-H2': { frequency: 96, flash: 4096, sram: 320, connectivity: ['ble', 'zigbee', 'thread'], usbDevice: true },  // USB Serial/JTAG
    'ESP32-P4': { frequency: 400, flash: 0, sram: 768, connectivity: [], usbDevice: true },  // USB OTG
    
    // STM32F 系列
    'STM32F0': { frequency: 48, flash: [16, 256], sram: [4, 32] },
    'STM32F1': { frequency: 72, flash: [16, 512], sram: [4, 64] },
    'STM32F2': { frequency: 120, flash: [128, 1024], sram: [64, 128] },
    'STM32F3': { frequency: 72, flash: [16, 512], sram: [16, 80] },
    'STM32F4': { frequency: 180, flash: [128, 2048], sram: [64, 384] },
    'STM32F7': { frequency: 216, flash: [512, 2048], sram: [256, 512] },
    
    // STM32G 系列
    'STM32G0': { frequency: 64, flash: [16, 512], sram: [8, 144] },
    'STM32G4': { frequency: 170, flash: [32, 512], sram: [32, 128] },
    
    // STM32H 系列
    'STM32H5': { frequency: 250, flash: [128, 2048], sram: [256, 640] },
    'STM32H7': { frequency: 480, flash: [128, 2048], sram: [564, 1024] },
    
    // STM32C 系列
    'STM32C0': { frequency: 48, flash: [16, 32], sram: [6, 12] },
    
    // RP2040 / RP2350 - 都有原生 USB Device
    'RP2040': { frequency: 133, flash: 2048, sram: 264, cores: 2, usbDevice: true },
    'RP2350': { frequency: 150, flash: 4096, sram: 520, cores: 2, usbDevice: true },
    'Pico': { frequency: 133, flash: 2048, sram: 264, cores: 2, usbDevice: true },
    'Pico W': { frequency: 133, flash: 2048, sram: 264, cores: 2, connectivity: ['wifi', 'ble'], usbDevice: true },
    'Pico 2': { frequency: 150, flash: 4096, sram: 520, cores: 2, usbDevice: true },
    'Pico 2 W': { frequency: 150, flash: 4096, sram: 520, cores: 2, connectivity: ['wifi', 'ble'], usbDevice: true },
    
    // Renesas RA4M1 (Arduino UNO R4) - 有 USB Device
    'RA4M1': { frequency: 48, flash: 256, sram: 32, usbDevice: true },
    'R4': { frequency: 48, flash: 256, sram: 32, usbDevice: true },
    'UNO R4': { frequency: 48, flash: 256, sram: 32, usbDevice: true },
    'UNO R4 Minima': { frequency: 48, flash: 256, sram: 32, usbDevice: true },
    'UNO R4 WiFi': { frequency: 48, flash: 256, sram: 32, connectivity: ['wifi', 'ble'], usbDevice: true },
    'Nano R4': { frequency: 48, flash: 256, sram: 32, usbDevice: true },
    
    // SAM - 有 USB OTG
    'ATSAM3X8E': { frequency: 84, flash: 512, sram: 96, usbDevice: true },
    
    // nRF52 - 有 USB Device
    'nRF52840': { frequency: 64, flash: 1024, sram: 256, connectivity: ['ble'], usbDevice: true },
    
    // CH552 - 本身就是 USB 芯片
    'CH552': { frequency: 24, flash: 16, sram: 1.25, usbDevice: true },
};

// ============ 通用接口映射 ============
const CORE_INTERFACES = {
    'arduino:avr': ['uart', 'i2c', 'spi', 'adc'],
    'esp32:esp32': ['uart', 'i2c', 'spi', 'i2s', 'adc', 'dac', 'touch', 'sd-card'],
    'STMicroelectronics:stm32': ['uart', 'i2c', 'spi', 'adc', 'dac', 'can', 'usb-otg'],
    'rp2040:rp2040': ['uart', 'i2c', 'spi', 'adc', 'pio', 'usb-device'],
    'arduino:renesas_uno': ['uart', 'i2c', 'spi', 'adc', 'dac', 'can', 'usb-device'],
};

// ============ 辅助函数 ============

/**
 * 从 description 或 keywords 中提取 MCU 型号
 */
function extractMCU(pkg, boardJson) {
    const text = `${pkg.description || ''} ${pkg.nickname || ''} ${(pkg.keywords || []).join(' ')}`.toUpperCase();
    const boardType = boardJson?.type || '';
    const core = boardJson?.core || '';
    
    // ===== 优先通过 core/type 精确匹配 =====
    
    // Renesas RA4M1 - Arduino R4 系列（优先级最高，因为可能同时提到 ESP32-S3 作为协处理器）
    if (core.includes('renesas') || boardType.includes('renesas')) {
        if (boardType.includes('unor4wifi') || text.includes('R4 WIFI')) return 'UNO R4 WiFi';
        if (boardType.includes('minima') || text.includes('MINIMA')) return 'UNO R4 Minima';
        if (text.includes('NANO R4')) return 'Nano R4';
        return 'UNO R4';
    }
    
    // RP2040 / RP2350 - Pico 系列
    if (core.includes('rp2040') || boardType.includes('rp2040')) {
        if (boardType.includes('pico2w') || text.includes('PICO 2 W') || text.includes('PICO2 W')) return 'Pico 2 W';
        if (boardType.includes('pico2') || text.includes('PICO 2') || text.includes('PICO2') || text.includes('RP2350')) return 'Pico 2';
        if (boardType.includes('picow') || text.includes('PICO W')) return 'Pico W';
        return 'RP2040';
    }
    
    // ===== 然后是 ESP32 系列 =====
    if (text.includes('ESP32-S3') || text.includes('ESP32S3') || boardType.includes('esp32s3')) return 'ESP32-S3';
    if (text.includes('ESP32-S2') || text.includes('ESP32S2') || boardType.includes('esp32s2')) return 'ESP32-S2';
    if (text.includes('ESP32-C3') || text.includes('ESP32C3') || boardType.includes('esp32c3')) return 'ESP32-C3';
    if (text.includes('ESP32-C6') || text.includes('ESP32C6') || boardType.includes('esp32c6')) return 'ESP32-C6';
    if (text.includes('ESP32-H2') || text.includes('ESP32H2') || boardType.includes('esp32h2')) return 'ESP32-H2';
    if (text.includes('ESP32-P4') || text.includes('ESP32P4') || boardType.includes('esp32p4')) return 'ESP32-P4';
    if (text.includes('ESP32') || boardType.includes('esp32:esp32:esp32')) return 'ESP32';
    
    // STM32 系列检测
    const stm32Match = text.match(/STM32([FGHLC]\d)/);
    if (stm32Match) return `STM32${stm32Match[1]}`;
    
    // AVR 检测 - 优先匹配具体型号
    if (text.includes('ATMEGA328P') || text.includes('ATMEGA328')) return 'ATmega328P';
    if (text.includes('ATMEGA32U4')) return 'ATmega32U4';
    if (text.includes('ATMEGA168')) return 'ATmega168';
    if (text.includes('ATMEGA2560')) return 'ATmega2560';
    // 模糊匹配（放在最后）
    if (text.includes('MEGA') && !text.includes('UNO')) return 'ATmega2560';
    if (text.includes('UNO') && !text.includes('R4')) return 'ATmega328P';
    if (text.includes('NANO') && !text.includes('R4')) return 'ATmega328P';
    if (text.includes('LEONARDO')) return 'ATmega32U4';
    
    // 备选 Pico/R4 检测（无 core 信息时）
    if (text.includes('PICO 2 W') || text.includes('PICO2 W') || text.includes('PICO2W')) return 'Pico 2 W';
    if (text.includes('PICO 2') || text.includes('PICO2') || text.includes('RP2350')) return 'Pico 2';
    if (text.includes('PICO W') || text.includes('PICOW')) return 'Pico W';
    if (text.includes('RP2040') || text.includes('PICO')) return 'RP2040';
    
    if (text.includes('UNO R4 WIFI') || text.includes('R4 WIFI')) return 'UNO R4 WiFi';
    if (text.includes('UNO R4 MINIMA')) return 'UNO R4 Minima';
    if (text.includes('NANO R4')) return 'Nano R4';
    if (text.includes('UNO R4') || text.includes('RA4M1')) return 'UNO R4';
    
    // SAM
    if (text.includes('DUE') || text.includes('SAM3X')) return 'ATSAM3X8E';
    
    // nRF52
    if (text.includes('NRF52840')) return 'nRF52840';
    
    // CH552
    if (text.includes('CH552')) return 'CH552';
    
    return '';
}

/**
 * 获取架构
 */
function getArchitecture(core, boardType) {
    // 优先使用更精确的 type
    if (boardType && ARCHITECTURE_MAP[boardType]) {
        return ARCHITECTURE_MAP[boardType];
    }
    if (core && ARCHITECTURE_MAP[core]) {
        return ARCHITECTURE_MAP[core];
    }
    return '';
}

/**
 * 判断是否为系列型开发板（如 STM32）
 */
function isSeriesBoard(dirName, pkg) {
    const name = dirName.toUpperCase();
    // STM32 系列通常目录名是 STM32Fx 格式 或者STM32WB
    if (/^STM32[FGHLC]\d$/.test(name)) return true;
    if (/^STM32WB$/.test(name)) return true;
    return false;
}

/**
 * 从 board.json 提取 GPIO 数量
 */
function extractGPIO(boardJson) {
    const digitalPins = boardJson?.digitalPins || [];
    const analogPins = boardJson?.analogPins || [];
    const pwmPins = boardJson?.pwmPins || [];
    
    return {
        digital: digitalPins.length,
        analog: analogPins.length,
        pwm: pwmPins.length || Math.floor(digitalPins.length / 4) // 估算
    };
}

/**
 * 从 description 提取 tags
 */
function extractTags(pkg, mcu, arch) {
    const tags = [];
    const text = `${pkg.description || ''} ${pkg.nickname || ''} ${(pkg.keywords || []).join(' ')}`.toLowerCase();
    
    // 通用标签
    if (text.includes('wifi') || text.includes('wi-fi')) tags.push('WiFi');
    if (text.includes('bluetooth') || text.includes('ble')) tags.push('蓝牙');
    if (text.includes('camera') || text.includes('摄像')) tags.push('摄像头');
    if (text.includes('display') || text.includes('显示') || text.includes('lcd') || text.includes('oled')) tags.push('显示屏');
    if (text.includes('iot') || text.includes('物联')) tags.push('物联网');
    if (text.includes('ai') || text.includes('人工智能') || text.includes('机器学习')) tags.push('AI');
    if (text.includes('教育') || text.includes('入门') || text.includes('初学')) tags.push('入门');
    if (text.includes('工业') || text.includes('industrial')) tags.push('工业级');
    
    // 架构相关
    if (arch.includes('arm')) tags.push('ARM');
    if (arch.includes('riscv')) tags.push('RISC-V');
    if (mcu.includes('ESP32')) tags.push('乐鑫');
    if (mcu.includes('STM32')) tags.push('STM32');
    if (mcu.includes('ATmega')) tags.push('Arduino');
    
    return [...new Set(tags)];
}

/**
 * 生成单一型开发板的 info.json
 */
function generateBoardInfo(dirName, pkg, boardJson) {
    const mcu = extractMCU(pkg, boardJson);
    const core = boardJson?.core || '';
    const boardType = boardJson?.type || '';
    const arch = getArchitecture(core, boardType);
    const specs = MCU_SPECS[mcu] || {};
    const gpio = extractGPIO(boardJson);
    
    // 确定 Flash 和 SRAM（优先使用 MCU 规格，否则尝试从 description 提取）
    let flash = specs.flash || 0;
    let sram = specs.sram || 0;
    
    // 从 description 提取内存信息
    const desc = (pkg.description || '').toUpperCase();
    const flashMatch = desc.match(/(\d+)\s*(?:KB|K)\s*FLASH/i) || desc.match(/FLASH\s*(\d+)\s*(?:KB|K)/i);
    const sramMatch = desc.match(/(\d+)\s*(?:KB|K)\s*(?:SRAM|RAM)/i) || desc.match(/(?:SRAM|RAM)\s*(\d+)\s*(?:KB|K)/i);
    if (flashMatch) flash = parseInt(flashMatch[1]);
    if (sramMatch) sram = parseInt(sramMatch[1]);
    
    // 获取基础接口，然后根据 usbDevice 属性添加 usb-device
    let interfaces = [...(CORE_INTERFACES[core] || ['uart', 'i2c', 'spi'])];
    if (specs.usbDevice && !interfaces.includes('usb-device')) {
        interfaces.push('usb-device');
    }
    
    const info = {
        $schema: 'board-info-schema',
        name: pkg.name?.replace('@aily-project/', '') || dirName,
        displayName: pkg.nickname || pkg.name?.replace('@aily-project/', '') || dirName,
        brand: pkg.brand || '',
        type: 'board',
        mcu: {
            model: mcu,
            architecture: arch,
            cores: specs.cores || 1,
            frequency: {
                value: specs.frequency || 0,
                unit: 'MHz'
            }
        },
        memory: {
            flash: { value: flash, unit: 'KB' },
            sram: { value: sram, unit: 'KB' }
        },
        connectivity: specs.connectivity || [],  // 无线连接能力，默认为空
        gpio: gpio,
        interfaces: interfaces,
        voltage: {
            operating: arch.includes('avr') ? 5 : 3.3,
            io: arch.includes('avr') ? [5] : [3.3]
        },
        features: [],
        core: boardType,
        tags: extractTags(pkg, mcu, arch)
    };
    
    // 添加 PSRAM（如果有）
    if (specs.psram) {
        info.memory.psram = { value: specs.psram, unit: 'KB' };
    }
    
    return info;
}

/**
 * 生成系列型开发板的 info.json
 */
function generateSeriesInfo(dirName, pkg, boardJson) {
    const mcu = extractMCU(pkg, boardJson);
    const core = boardJson?.core || '';
    const boardType = boardJson?.type || '';
    const arch = getArchitecture(core, boardType);
    const specs = MCU_SPECS[mcu] || {};
    
    // 系列型的 flash/sram 是范围
    const flashRange = Array.isArray(specs.flash) ? specs.flash : [specs.flash || 0, specs.flash || 0];
    const sramRange = Array.isArray(specs.sram) ? specs.sram : [specs.sram || 0, specs.sram || 0];
    
    const info = {
        $schema: 'board-info-schema',
        name: pkg.name?.replace('@aily-project/', '') || dirName, // dirName.toLowerCase(),
        displayName: pkg.nickname || `${dirName} Series`,
        brand: pkg.brand || '',
        type: 'series',
        
        seriesInfo: {
            description: pkg.description || '',
            baseArchitecture: arch,
            frequencyRange: {
                min: specs.frequency || 0,
                max: specs.frequency || 0,
                unit: 'MHz'
            },
            flashRange: {
                min: flashRange[0],
                max: flashRange[1],
                unit: 'KB'
            },
            sramRange: {
                min: sramRange[0],
                max: sramRange[1],
                unit: 'KB'
            },
            packageOptions: []
        },
        
        variants: [],  // 需要手动填充具体型号
        
        commonSpecs: {
            connectivity: specs.connectivity || [],  // 无线连接能力
            interfaces: CORE_INTERFACES[core] || ['uart', 'i2c', 'spi', 'can'],
            voltage: {
                operating: 3.3,
                io: [3.3]
            },
            features: []
        },
        
        core: core,
        tags: extractTags(pkg, mcu, arch),
        
        selectionGuide: {
            byFlash: {},
            byPackage: {},
            byFeature: {}
        }
    };
    
    return info;
}

/**
 * 获取所有开发板目录
 */
function getBoardDirs() {
    const items = fs.readdirSync(BOARDS_DIR);
    const boardDirs = [];

    for (const item of items) {
        const itemPath = path.join(BOARDS_DIR, item);
        if (EXCLUDE_DIRS.includes(item) || !fs.statSync(itemPath).isDirectory()) {
            continue;
        }

        const pkgPath = path.join(itemPath, 'package.json');
        const boardPath = path.join(itemPath, 'board.json');
        
        if (fs.existsSync(pkgPath)) {
            boardDirs.push({
                name: item,
                path: itemPath,
                pkgPath: pkgPath,
                boardPath: fs.existsSync(boardPath) ? boardPath : null,
                infoPath: path.join(itemPath, 'info.json')
            });
        }
    }

    return boardDirs;
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);
    const regenerateAll = args.includes('--all');
    const dryRun = args.includes('--dry-run');
    const specificBoard = args.find(a => !a.startsWith('--'));
    
    console.log('info.json 自动生成脚本');
    console.log('========================\n');
    
    if (dryRun) console.log('[ 预览模式 - 不会实际写入文件 ]\n');
    
    const boardDirs = getBoardDirs();
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const board of boardDirs) {
        // 如果指定了特定开发板
        if (specificBoard && board.name !== specificBoard) {
            continue;
        }
        
        // 检查是否已存在
        if (!regenerateAll && fs.existsSync(board.infoPath)) {
            console.log(`⏭  ${board.name} - 已存在，跳过`);
            skipped++;
            continue;
        }
        
        try {
            // 读取 package.json
            const pkg = JSON.parse(fs.readFileSync(board.pkgPath, 'utf8'));
            
            // 读取 board.json（如果存在）
            let boardJson = null;
            if (board.boardPath) {
                boardJson = JSON.parse(fs.readFileSync(board.boardPath, 'utf8'));
            }
            
            // 判断类型并生成
            const isSeries = isSeriesBoard(board.name, pkg);
            const info = isSeries 
                ? generateSeriesInfo(board.name, pkg, boardJson)
                : generateBoardInfo(board.name, pkg, boardJson);
            
            // 写入或预览
            if (dryRun) {
                console.log(`\n📋 ${board.name} (${isSeries ? '系列型' : '单一型'}):`);
                console.log(JSON.stringify(info, null, 2).slice(0, 500) + '...\n');
            } else {
                fs.writeFileSync(board.infoPath, JSON.stringify(info, null, 2), 'utf8');
                console.log(`✅ ${board.name} - ${isSeries ? '系列型' : '单一型'}`);
            }
            generated++;
            
        } catch (error) {
            console.error(`❌ ${board.name} - 错误: ${error.message}`);
            errors++;
        }
    }
    
    console.log('\n========================');
    console.log(`生成: ${generated}, 跳过: ${skipped}, 错误: ${errors}`);
    
    if (!dryRun && generated > 0) {
        console.log('\n提示: 生成的 info.json 可能需要手动补充以下信息:');
        console.log('  - 具体的 MCU 规格（主频、内存）');
        console.log('  - 系列型开发板的 variants 列表');
        console.log('  - 特殊功能和标签');
    }
}

main();
