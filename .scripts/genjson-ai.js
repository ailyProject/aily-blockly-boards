const fs = require('fs').promises;
const path = require('path');

// 默认要提取的package.json中的键
const defaultKeysToExtract = [
  'name',
  'nickname',
  'description',
  'brand',
  'url',
  'compatibility',
];

// 自定义目录顺序 - 这里定义你想要的目录顺序
const directoryOrder = [
  'arduino_uno',
  'arduino_mega',
  'arduino_uno_r4_minima',
  'arduino_uno_r4_wifi'
];

// 根据配置过滤package.json对象
function filterPackageJson(packageJson, keysToExtract, subdir) {
  const filteredJson = {};

  keysToExtract.forEach(key => {
    if (packageJson.hasOwnProperty(key)) {
      filteredJson[key] = packageJson[key];
    } else {
      // 对disabled属性进行特殊处理，默认为false
      if (key === 'disabled') {
        filteredJson[key] = false;
      } else {
        filteredJson[key] = "";
      }
    }
    
    // 对img和pinmap属性进行特殊处理，使用目录路径
    if (key === 'img') {
      filteredJson[key] = `${subdir}/board.webp`;
    } else if (key === 'pinmap') {
      filteredJson[key] = `${subdir}/pinmap.webp`;
    }
  });

  return filteredJson;
}

async function main() {
  try {
    // 获取当前目录路径
    const currentDir = path.join(__dirname, '..');

    // 设置要提取的键，可以根据需要修改这个数组
    // 如果要提取所有键，可以设置为null
    const keysToExtract = defaultKeysToExtract;

    // 读取当前目录下的所有项
    const dirents = await fs.readdir(currentDir, { withFileTypes: true });

    // 过滤出子目录
    let subdirs = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // 根据自定义顺序排序子目录
    subdirs.sort((a, b) => {
      const indexA = directoryOrder.indexOf(a);
      const indexB = directoryOrder.indexOf(b);

      // 如果两个目录都在自定义顺序列表中
      if (indexA >= 0 && indexB >= 0) {
        return indexA - indexB;
      }

      // 如果只有a在列表中，a排在前面
      if (indexA >= 0) {
        return -1;
      }

      // 如果只有b在列表中，b排在前面
      if (indexB >= 0) {
        return 1;
      }

      // 如果都不在列表中，按字母顺序排列
      return a.localeCompare(b);
    });

    // 存储所有package.json的内容
    const libraries = [];

    // 处理每个子目录
    for (const subdir of subdirs) {
      const packageJsonPath = path.join(currentDir, subdir, 'package.json');

      try {
        // 检查并读取package.json
        await fs.access(packageJsonPath, fs.constants.F_OK);
        const data = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(data);

        // 如果package.json中hide为true，跳过该项
        if (packageJson.hide === true) {
          console.log(`${subdir}/package.json 设置了 hide:true，跳过`);
          continue;
        }

        // 根据配置过滤package.json
        const filteredJson = keysToExtract ? filterPackageJson(packageJson, keysToExtract, subdir) : packageJson;

        libraries.push(filteredJson);
        console.log(`成功读取 ${subdir}/package.json`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`${subdir}目录下没有找到package.json`);
        } else {
          console.error(`处理${packageJsonPath}时出错:`, error);
        }
      }
    }

    // 将disabled为true的项目放到数组最后
    libraries.sort((a, b) => {
      // 如果a是禁用的而b不是，a应该排在后面
      if (a.disabled === true && b.disabled !== true) {
        return 1;
      }
      // 如果b是禁用的而a不是，b应该排在后面
      if (b.disabled === true && a.disabled !== true) {
        return -1;
      }
      // 其他情况保持原有顺序
      return 0;
    });

    // 写入结果到boards-ai.json
    const librariesJson = JSON.stringify(libraries, null);
    const outputPath = path.join(currentDir, 'boards-ai.json');
    await fs.writeFile(outputPath, librariesJson, 'utf8');

    console.log(`成功将${libraries.length}个库的信息写入到${outputPath}`);
  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 执行主函数
main();