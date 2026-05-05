const fs = require('fs').promises;
const path = require('path');

// 默认要提取的package.json中的键
const defaultKeysToExtract = [
  'name',
  'nickname',
  'version',
  'description',
  'author',
  'brand',
  'url',
  'compatibility',
  'img',
  'pinmap',
  'state',
  'type',
  'mode'
];

// 自定义目录顺序 - 这里定义你想要的目录顺序
const directoryOrder = [
  'arduino_uno',
  'arduino_mega',
  'arduino_uno_r4_minima',
  'arduino_uno_r4_wifi'
];

// 根据配置过滤package.json对象
async function filterPackageJson(packageJson, keysToExtract, subdir) {
  const filteredJson = {};

  let boardJsonCache = null;
  let boardJsonLoaded = false;

  const loadBoardJson = async () => {
    if (boardJsonLoaded) {
      return boardJsonCache;
    }

    boardJsonLoaded = true;

    try {
      const boardJsonPath = path.join(__dirname, '..', subdir, 'board.json');
      await fs.access(boardJsonPath, fs.constants.F_OK);
      const boardData = await fs.readFile(boardJsonPath, 'utf8');
      boardJsonCache = JSON.parse(boardData);
    } catch (error) {
      console.log(`无法读取${subdir}/board.json:`, error.message);
      boardJsonCache = null;
    }

    return boardJsonCache;
  };

  // 动态提取所有 description_* 的多语言键
  const descriptionKeys = Object.keys(packageJson).filter(k => k.startsWith('description_'));
  const allKeys = [...keysToExtract, ...descriptionKeys.filter(k => !keysToExtract.includes(k))];

  for (const key of allKeys) {
    if (key === 'mode') {
      let modeValue = ['arduino'];
      const boardJson = await loadBoardJson();
      if (boardJson && Object.prototype.hasOwnProperty.call(boardJson, 'mode')) {
        if (Array.isArray(boardJson.mode)) {
          modeValue = boardJson.mode;
        } else if (typeof boardJson.mode === 'string') {
          modeValue = [boardJson.mode];
        } else if (boardJson.mode != null) {
          modeValue = boardJson.mode;
        }
      }

      filteredJson[key] = modeValue;
      continue;
    }

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

    // 对type属性进行特殊处理，从board.json中提取
    if (key === 'type') {
      const boardJson = await loadBoardJson();
      if (boardJson && Object.prototype.hasOwnProperty.call(boardJson, 'type')) {
        filteredJson[key] = boardJson.type;
      }
    }
  }

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
        const filteredJson = keysToExtract ? await filterPackageJson(packageJson, keysToExtract, subdir) : packageJson;

        libraries.push(filteredJson);
        console.log(`成功读取 ${subdir}/package.json`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // 没有package.json，检查是否存在board.webp
          const boardWebpPath = path.join(currentDir, subdir, 'board.webp');
          try {
            await fs.access(boardWebpPath, fs.constants.F_OK);
            const defaultItem = {
              name: `@aily-project/board-${subdir}`,
              nickname: subdir,
              version: '0.0.1',
              description: 'Support coming soon',
              author: '',
              brand: '',
              url: 'https://aily.rpo',
              compatibility: '',
              img: `${subdir}/board.webp`,
              pinmap: `${subdir}/pinmap.webp`,
              state: 'todo',
              type: '',
              mode: ['arduino']
            };
            libraries.push(defaultItem);
            console.log(`${subdir}目录下没有package.json，但存在board.webp，已生成默认项`);
          } catch {
            console.log(`${subdir}目录下没有找到package.json和board.webp，跳过`);
          }
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

    // 写入结果到boards.json
    const librariesJson = JSON.stringify(libraries, null, 2);
    const outputPath = path.join(currentDir, 'boards.json');
    await fs.writeFile(outputPath, librariesJson, 'utf8');

    console.log(`成功将${libraries.length}个库的信息写入到${outputPath}`);
  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 执行主函数
main();