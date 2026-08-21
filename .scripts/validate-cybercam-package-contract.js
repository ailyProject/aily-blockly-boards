#!/usr/bin/env node

const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXPECTED_LOCALES = [
  'ar.json',
  'de.json',
  'en.json',
  'es.json',
  'fr.json',
  'ja.json',
  'ko.json',
  'pt.json',
  'ru.json',
  'zh_cn.json',
  'zh_hk.json',
];

const UPSTREAM_MIT_LICENSE = `MIT License

Copyright (c) 2023 Walnut Pi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readWebpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.strictEqual(data.toString('ascii', 0, 4), 'RIFF', 'board.webp must be a RIFF file');
  assert.strictEqual(data.toString('ascii', 8, 12), 'WEBP', 'board.webp must be a WebP file');

  let offset = 12;
  while (offset + 8 <= data.length) {
    const chunkType = data.toString('ascii', offset, offset + 4);
    const chunkSize = data.readUInt32LE(offset + 4);
    const chunk = offset + 8;

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      return {
        width: data.readUIntLE(chunk + 4, 3) + 1,
        height: data.readUIntLE(chunk + 7, 3) + 1,
      };
    }
    if (chunkType === 'VP8 ' && chunkSize >= 10) {
      return {
        width: data.readUInt16LE(chunk + 6) & 0x3fff,
        height: data.readUInt16LE(chunk + 8) & 0x3fff,
      };
    }
    if (chunkType === 'VP8L' && chunkSize >= 5 && data[chunk] === 0x2f) {
      const dimensions = data.readUInt32LE(chunk + 1);
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      };
    }

    offset = chunk + chunkSize + (chunkSize % 2);
  }

  assert.fail('board.webp does not contain a supported WebP image chunk');
}

function readNpmPackManifest(boardRoot) {
  return JSON.parse(execSync('npm pack --dry-run --json', {
    cwd: boardRoot,
    encoding: 'utf8',
  }))[0];
}

function validateCyberCamPackageContract(boardRoot = path.resolve(__dirname, '..', 'cybercam')) {
  const packageJson = readJson(path.join(boardRoot, 'package.json'));
  const boardJson = readJson(path.join(boardRoot, 'board.json'));
  const templateJson = readJson(path.join(boardRoot, 'template', 'package.json'));
  const abi = readJson(path.join(boardRoot, 'template', 'project.abi'));
  const imageLicense = fs.readFileSync(path.join(boardRoot, 'LICENSE.image.txt'), 'utf8')
    .replace(/\r\n/g, '\n');
  const readme = fs.readFileSync(path.join(boardRoot, 'readme.md'), 'utf8');

  assert.strictEqual(packageJson.name, '@aily-project/board-cybercam');
  assert.strictEqual(packageJson.version, '1.1.0');
  assert.strictEqual(packageJson.nickname, 'CyberCAM');
  assert.strictEqual(packageJson.brand, '01Studio');
  if (packageJson.main !== undefined) {
    assert.strictEqual(typeof packageJson.main, 'string', 'package main must be a string');
    assert(
      fs.existsSync(path.join(boardRoot, packageJson.main)),
      `package main entry is missing: ${packageJson.main}`,
    );
  }
  assert.strictEqual(
    packageJson.scripts.test,
    'node ../.scripts/validate-cybercam-package-contract.js . && node ../.scripts/validate-boards-compliance.js .',
  );

  assert.strictEqual(
    boardJson.version,
    packageJson.version,
    'board.json version must match package.json version',
  );
  assert.strictEqual(boardJson.core, 'python:k230');
  assert.strictEqual(boardJson.type, 'python:k230:cybercam');
  assert.deepStrictEqual(boardJson.mode, ['python']);
  assert.deepStrictEqual(boardJson.runtime, {
    kind: 'python',
    adapter: 'canmv-k230',
    entry: 'main.py',
    execution: {
      transport: 'canmv-usbdbg',
      output: 'event-stream',
      input: 'repl',
      stop: 'device-interrupt',
      files: 'canmv-io',
      temporaryRun: true,
    },
    deployment: {
      autostart: {
        kind: 'boot-start-sh',
        directory: '/boot/start',
        backgroundRequired: true,
      },
    },
  });
  assert.deepStrictEqual(boardJson.capabilities, {
    camera: true,
    display: true,
    touch: true,
    audioInput: true,
    audioOutput: true,
    imu: true,
    wifi: true,
    bluetooth: true,
    gpio: true,
    pwm: true,
    uart: true,
    i2c: true,
    spi: true,
  });
  assert.strictEqual(boardJson.usbVid, '1209');
  assert.strictEqual(boardJson.usbPid, 'abd1');
  assert.deepStrictEqual(boardJson.cameraConfig, {
    interface: 'mipi-csi',
    supportedModels: ['gc2093', 'ov5647'],
    pins: {},
  });
  assert.deepStrictEqual(boardJson.displayConfig, {
    controller: 'st7701s',
    interface: 'mipi-dsi',
    width: 640,
    height: 480,
    pins: {},
  });
  assert.deepStrictEqual(boardJson.audioConfig, { pins: {} });

  assert.deepStrictEqual(
    boardJson.digitalPins.map(([, value]) => value).sort((a, b) => Number(a) - Number(b)),
    ['11', '12', '14', '15', '16', '17', '21', '46', '47', '52', '60', '61'],
  );
  assert.deepStrictEqual(
    boardJson.pwmPins.map(([, value]) => value).sort((a, b) => Number(a) - Number(b)),
    ['46', '47', '60', '61'],
  );
  assert.deepStrictEqual(boardJson.serialPins, {
    UART2: [['TX', '11'], ['RX', '12']],
  });
  assert.deepStrictEqual(boardJson.i2cPins, {
    I2C2: [['SCL', '11'], ['SDA', '12']],
    I2C1: [['SCL', '40'], ['SDA', '41']],
  });
  assert.deepStrictEqual(boardJson.spiPins, {
    SPI0: [['CS0', '14'], ['SCLK', '15'], ['MOSI', '16'], ['MISO', '17']],
  });
  assert.deepStrictEqual(boardJson.builtinLed, [['LED', '52']]);
  assert.deepStrictEqual(boardJson.builtinButton, [['KEY', '21']]);
  assert.deepStrictEqual(boardJson.specialPins, {
    led: '52',
    key: '21',
    fillLight: { pin: '46', pwm: 'PWM2' },
    buzzer: { pin: '47', pwm: 'PWM3' },
    imu: { bus: 'I2C1', scl: '40', sda: '41' },
  });
  assert(!boardJson.interruptPins.some(([, value]) => value === '60' || value === '61'));

  const locales = fs.readdirSync(path.join(boardRoot, 'i18n'))
    .filter(file => file.endsWith('.json'))
    .sort();
  assert.deepStrictEqual(locales, EXPECTED_LOCALES);
  for (const locale of locales) {
    readJson(path.join(boardRoot, 'i18n', locale));
  }

  assert.deepStrictEqual(readWebpDimensions(path.join(boardRoot, 'board.webp')), {
    width: 200,
    height: 200,
  });
  assert.match(imageLicense, /Source asset: docs\/cybercam\/intro\/img\/product\/intro2\.png/);
  assert(imageLicense.endsWith(UPSTREAM_MIT_LICENSE), 'image license must preserve upstream MIT text verbatim');
  assert.match(readme, /LICENSE\.image\.txt/);
  assert.match(readme, /K230I2SINNO/);
  assert.doesNotMatch(readme, /`inno` codec/);

  const packedFiles = readNpmPackManifest(boardRoot).files.map(file => file.path);
  assert(packedFiles.includes('LICENSE.image.txt'), 'npm pack must include LICENSE.image.txt');

  const starterBlocks = abi.blocks && abi.blocks.blocks;
  assert(Array.isArray(starterBlocks), 'project.abi must contain blocks.blocks');
  assert.deepStrictEqual(
    starterBlocks.map(({ type, deletable }) => ({ type, deletable })),
    [
      { type: 'cybercam_start', deletable: false },
      { type: 'cybercam_forever', deletable: false },
    ],
  );

  assert.strictEqual(templateJson.devmode, 'python');
  const boardDependencies = Object.entries(templateJson.dependencies)
    .filter(([name]) => name.startsWith('@aily-project/board-'));
  assert.deepStrictEqual(
    boardDependencies,
    [['@aily-project/board-cybercam', packageJson.version]],
  );
  assert.deepStrictEqual(templateJson.dependencies, {
    '@aily-project/board-cybercam': packageJson.version,
    '@aily-project/lib-cybercam': '1.0.0',
  });

  return true;
}

if (require.main === module) {
  try {
    const boardRoot = process.argv[2]
      ? path.resolve(process.argv[2])
      : path.resolve(__dirname, '..', 'cybercam');
    validateCyberCamPackageContract(boardRoot);
    console.log('✅ CyberCAM package contract passed');
  } catch (error) {
    console.error(`❌ CyberCAM package contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  validateCyberCamPackageContract,
};
