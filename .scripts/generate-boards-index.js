/**
 * 开发板索引生成脚本
 * 从各开发板目录的 info.json 生成统一的 boards-index.json
 * 
 * 使用方法: node generate-boards-index.js
 */

const fs = require('fs');
const path = require('path');

const BOARDS_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(BOARDS_DIR, 'boards-index.json');

// 需要排除的目录
const EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    '参考',
    'archive'
];

/**
 * 递归获取所有开发板目录
 */
function getBoardDirs() {
    const items = fs.readdirSync(BOARDS_DIR);
    const boardDirs = [];

    for (const item of items) {
        const itemPath = path.join(BOARDS_DIR, item);
        
        // 跳过排除目录和文件
        if (EXCLUDE_DIRS.includes(item) || !fs.statSync(itemPath).isDirectory()) {
            continue;
        }

        // 检查是否存在 info.json
        const infoPath = path.join(itemPath, 'info.json');
        if (fs.existsSync(infoPath)) {
            boardDirs.push({
                name: item,
                infoPath: infoPath
            });
        }
    }

    return boardDirs;
}

/**
 * 解析开发板 info.json 并提取索引字段
 */
function parseBoardInfo(infoPath, dirName) {
    try {
        const content = fs.readFileSync(infoPath, 'utf8');
        const info = JSON.parse(content);

        // 判断是单一型还是系列型开发板
        const isSeries = info.type === 'series';

        if (isSeries) {
            // 系列型开发板
            return {
                name: info.name || dirName,
                displayName: info.displayName || info.name,
                brand: info.brand || '',
                type: 'series',
                // 系列信息
                mcu: info.seriesInfo?.baseArchitecture ? `${info.displayName} Series` : '',
                architecture: info.seriesInfo?.baseArchitecture || '',
                cores: 1,
                // 使用范围值
                frequency: info.seriesInfo?.frequencyRange?.max || 0,
                frequencyMin: info.seriesInfo?.frequencyRange?.min || 0,
                frequencyUnit: info.seriesInfo?.frequencyRange?.unit || 'MHz',
                flash: convertToKB(info.seriesInfo?.flashRange ? { value: info.seriesInfo.flashRange.max, unit: info.seriesInfo.flashRange.unit } : null),
                flashMin: convertToKB(info.seriesInfo?.flashRange ? { value: info.seriesInfo.flashRange.min, unit: info.seriesInfo.flashRange.unit } : null),
                sram: convertToKB(info.seriesInfo?.sramRange ? { value: info.seriesInfo.sramRange.max, unit: info.seriesInfo.sramRange.unit } : null),
                sramMin: convertToKB(info.seriesInfo?.sramRange ? { value: info.seriesInfo.sramRange.min, unit: info.seriesInfo.sramRange.unit } : null),
                psram: 0,
                connectivity: info.commonSpecs?.connectivity || [],
                interfaces: info.commonSpecs?.interfaces || [],
                gpio: {
                    digital: 0,
                    analog: 0,
                    pwm: 0
                },
                voltage: info.commonSpecs?.voltage?.operating || 0,
                core: info.core || '',
                features: info.commonSpecs?.features || [],
                tags: info.tags || [],
                // 系列特有字段
                variantCount: (info.variants || []).length,
                variants: (info.variants || []).map(v => v.model),
                packageOptions: info.seriesInfo?.packageOptions || [],
                selectionGuide: info.selectionGuide || null
            };
        } else {
            // 单一型开发板
            return {
                name: info.name || dirName,
                displayName: info.displayName || info.name,
                brand: info.brand || '',
                type: 'board',
                mcu: info.mcu?.model || '',
                architecture: info.mcu?.architecture || '',
                cores: info.mcu?.cores || 1,
                frequency: info.mcu?.frequency?.value || 0,
                frequencyUnit: info.mcu?.frequency?.unit || 'MHz',
                flash: convertToKB(info.memory?.flash),
                sram: convertToKB(info.memory?.sram),
                psram: convertToKB(info.memory?.psram),
                connectivity: info.connectivity || [],
                interfaces: info.interfaces || [],
                gpio: {
                    digital: info.gpio?.digital || 0,
                    analog: info.gpio?.analog || 0,
                    pwm: info.gpio?.pwm || 0
                },
                voltage: info.voltage?.operating || 0,
                core: info.core || '',
                features: info.features || [],
                tags: info.tags || []
            };
        }
    } catch (error) {
        console.error(`解析 ${infoPath} 失败:`, error.message);
        return null;
    }
}

/**
 * 将内存单位统一转换为 KB
 */
function convertToKB(memory) {
    if (!memory || !memory.value) return 0;
    
    const value = memory.value;
    const unit = (memory.unit || 'KB').toUpperCase();
    
    switch (unit) {
        case 'B':
            return Math.round(value / 1024);
        case 'KB':
            return value;
        case 'MB':
            return value * 1024;
        case 'GB':
            return value * 1024 * 1024;
        default:
            return value;
    }
}

/**
 * 生成索引文件
 */
function generateIndex() {
    console.log('开始生成开发板索引...\n');

    const boardDirs = getBoardDirs();
    console.log(`找到 ${boardDirs.length} 个包含 info.json 的开发板目录\n`);

    const boards = [];
    let successCount = 0;
    let failCount = 0;

    for (const { name, infoPath } of boardDirs) {
        const boardInfo = parseBoardInfo(infoPath, name);
        if (boardInfo) {
            boards.push(boardInfo);
            successCount++;
            console.log(`✓ ${name}`);
        } else {
            failCount++;
            console.log(`✗ ${name}`);
        }
    }

    // 按名称排序
    boards.sort((a, b) => a.name.localeCompare(b.name));

    // 生成索引文件
    const index = {
        $schema: 'boards-index-schema',
        version: '1.0.0',
        generated: new Date().toISOString(),
        count: boards.length,
        boards: boards
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index), 'utf8');

    console.log(`\n索引生成完成！`);
    console.log(`成功: ${successCount}, 失败: ${failCount}`);
    console.log(`输出文件: ${OUTPUT_FILE}`);

    // 生成统计信息
    printStatistics(boards);
}

/**
 * 打印统计信息
 */
function printStatistics(boards) {
    console.log('\n=== 统计信息 ===');

    // 按架构统计
    const archCount = {};
    boards.forEach(b => {
        const arch = b.architecture || 'unknown';
        archCount[arch] = (archCount[arch] || 0) + 1;
    });
    console.log('\n架构分布:');
    Object.entries(archCount).sort((a, b) => b[1] - a[1]).forEach(([arch, count]) => {
        console.log(`  ${arch}: ${count}`);
    });

    // 按品牌统计
    const brandCount = {};
    boards.forEach(b => {
        const brand = b.brand || 'unknown';
        brandCount[brand] = (brandCount[brand] || 0) + 1;
    });
    console.log('\n品牌分布:');
    Object.entries(brandCount).sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count}`);
    });

    // 按连接方式统计
    const connCount = {};
    boards.forEach(b => {
        (b.connectivity || []).forEach(conn => {
            connCount[conn] = (connCount[conn] || 0) + 1;
        });
    });
    console.log('\n连接方式分布:');
    Object.entries(connCount).sort((a, b) => b[1] - a[1]).forEach(([conn, count]) => {
        console.log(`  ${conn}: ${count}`);
    });
}

// 运行
generateIndex();
