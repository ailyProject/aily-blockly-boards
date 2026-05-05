const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * 将PNG文件转换为WebP格式的Node.js脚本
 * 扫描所有一级目录，找到PNG文件并转换为WebP格式
 */
async function convertPngToWebp() {
    const rootDir = path.join(__dirname, '..');
    
    try {
        // 读取根目录下的所有项目
        const items = fs.readdirSync(rootDir, { withFileTypes: true });
        
        // 筛选出目录
        const directories = items
            .filter(item => item.isDirectory() && !item.name.startsWith('.'))
            .map(item => item.name);
        
        console.log(`找到 ${directories.length} 个目录需要处理`);
        
        for (const dir of directories) {
            const dirPath = path.join(rootDir, dir);
            
            try {
                // 读取目录中的文件
                const files = fs.readdirSync(dirPath);
                
                // 查找PNG文件
                const pngFiles = files.filter(file => 
                    file.toLowerCase().endsWith('.png')
                );
                
                if (pngFiles.length === 0) {
                    console.log(`📁 ${dir}: 未找到PNG文件`);
                    continue;
                }
                
                console.log(`📁 ${dir}: 找到 ${pngFiles.length} 个PNG文件`);
                
                // 处理每个PNG文件
                for (const pngFile of pngFiles) {
                    const pngPath = path.join(dirPath, pngFile);
                    const webpFileName = path.basename(pngFile, '.png') + '.webp';
                    const webpPath = path.join(dirPath, webpFileName);
                    
                    try {
                        // 使用sharp转换PNG到WebP
                        await sharp(pngPath)
                            .webp({ 
                                quality: 80,  // 设置质量为80%
                                lossless: false  // 使用有损压缩以获得更小的文件
                            })
                            .toFile(webpPath);
                        
                        // 获取文件大小信息
                        const pngStats = fs.statSync(pngPath);
                        const webpStats = fs.statSync(webpPath);
                        const compressionRatio = ((pngStats.size - webpStats.size) / pngStats.size * 100).toFixed(1);
                        
                        console.log(`  ✅ ${pngFile} -> ${webpFileName}`);
                        console.log(`     原始大小: ${(pngStats.size / 1024).toFixed(1)}KB`);
                        console.log(`     压缩后: ${(webpStats.size / 1024).toFixed(1)}KB`);
                        console.log(`     压缩率: ${compressionRatio}%`);
                        
                    } catch (error) {
                        console.error(`  ❌ 转换失败 ${pngFile}:`, error.message);
                    }
                }
                
            } catch (error) {
                console.error(`❌ 无法读取目录 ${dir}:`, error.message);
            }
        }
        
        console.log('\n🎉 转换完成！');
        
    } catch (error) {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    }
}

// 检查是否安装了sharp库
function checkDependencies() {
    try {
        require.resolve('sharp');
        return true;
    } catch (error) {
        return false;
    }
}

// 主函数
async function main() {
    console.log('🚀 开始PNG到WebP转换...\n');
    
    // 检查依赖
    if (!checkDependencies()) {
        console.error('❌ 缺少依赖库 sharp');
        console.log('请运行: npm install sharp');
        process.exit(1);
    }
    
    await convertPngToWebp();
}

// 如果直接运行此脚本，执行main函数
if (require.main === module) {
    main();
}

module.exports = {
    convertPngToWebp,
    checkDependencies
};
