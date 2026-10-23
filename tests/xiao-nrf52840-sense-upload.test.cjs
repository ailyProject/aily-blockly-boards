'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

function required(name) {
  assert.ok(process.env[name], `Set ${name}; this suite must not silently skip verification`);
  return path.resolve(process.env[name]);
}
const builder = required('AILY_BUILDER_SOURCE');
const host = required('AILY_BLOCKLY_ROOT');
const sdk = required('AILY_TEST_SDK_PATH');
const project = required('AILY_VALIDATION_PROJECT');
const appdata = required('AILY_TEST_APPDATA');
const gcc = required('AILY_TEST_GCC_BIN');
const boardRoot = path.resolve(__dirname, '../xiao_nRF52840_sense');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const boardJson = readJson(path.join(boardRoot, 'board.json'));
const template = readJson(path.join(boardRoot, 'template/package.json'));
const req = createRequire(path.join(builder, 'package.json'));
req('tsx/cjs');
const { loadArduinoProperties } = req('./src/ArduinoPropertyFile.ts');
const { selectBoardProperties, resolveBoardMenus, applyBoardBuildProperties } = req('./src/BoardConfigResolver.ts');
const { resolveArduinoPlatformProperties } = req('./src/ArduinoPropertyResolver.ts');
const { resolveArduinoUploadCommand } = req('./src/ArduinoUploadCommand.ts');
const { selectUploadParamForPort, processUploadParams } = require(path.join(host, 'child/scripts/upload.js'));
const build = path.join(project, '.build');
const preprocess = readJson(path.join(project, '.temp/preprocess.json'));

function resolveFor(runtimeOs, options = template.projectConfig) {
  const all = loadArduinoProperties(path.join(sdk, 'boards.txt'), undefined, runtimeOs);
  const selected = selectBoardProperties(all, boardJson.type.split(':')[2], options);
  const board = applyBoardBuildProperties(resolveBoardMenus(selected, options).boardProperties, options);
  const platform = resolveArduinoPlatformProperties({
    platformProperties: loadArduinoProperties(path.join(sdk, 'platform.txt'), undefined, runtimeOs),
    boardProperties: board,
    generatedProperties: {
      'runtime.platform.path': runtimeOs === 'windows' ? 'C:/Aily Test/sdk/arm-ble_0.4.0' : sdk,
      'build.path': build,
      'build.project_name': 'sketch',
    },
  });
  const warnings = [];
  const upload = resolveArduinoUploadCommand({ board, platform }, { onWarning: m => warnings.push(m) });
  return { board, platform, upload, warnings };
}

for (const runtimeOs of ['windows', 'macosx', 'linux']) {
  test(`${runtimeOs}: SDK resolves factory bootloader, DFU tool, USB reset and flash protection`, () => {
    const { board, platform, upload, warnings } = resolveFor(runtimeOs);
    assert.deepEqual(warnings, []);
    assert.equal(board['build.variant'], 'Seeed_XIAO_nRF52840_Sense');
    assert.equal(board['build.ldscript'], 'nrf52840_s140_v7_adabl.ld');
    assert.equal(platform['build.lfclk_flags'], '-DUSE_LFXO');
    assert.match(platform['compiler.c.extra_flags'], /-DUSE_ADA_BL/);
    assert.match(platform['compiler.cpp.extra_flags'], /-DUSE_ADA_BL/);
    assert.match(platform['build.extra_flags'], /-DUSE_TINYUSB/);
    assert.equal(upload.toolName, 'adafruit-nrfutil');
    assert.equal(upload.use1200bpsTouch, true);
    assert.equal(upload.waitForUploadPort, true);
    assert.match(upload.command, /tools\/adafruit-nrfutil@1\.7\.0\/adafruit-nrfutil"/);
    assert.match(upload.command, /-pkg ".*sketch\.zip" -p \$\{serial\}/);
    assert.match(platform['recipe.objcopy.zip.pattern'], /dfu genpkg/);
    assert.doesNotMatch(upload.command.replace('${serial}', ''), /\{[^}]+\}/);
  });
}

test('real host build produces a usable DFU command without nrfutil on PATH', async () => {
  assert.equal(preprocess.success, true);
  const selection = selectUploadParamForPort(project, 'serial', boardJson);
  assert.equal(selection.success, true);
  assert.equal(selection.source, 'preprocess');
  const parsed = await processUploadParams(selection.uploadParam, build,
    path.join(appdata, 'tools'), sdk, '115200', {}, 'TEST_BOOTLOADER_PORT', process.platform, null, true);
  const unquote = s => s.replace(/^"|"$/g, '');
  assert.ok(fs.existsSync(unquote(parsed.command)));
  assert.equal(unquote(parsed.args[parsed.args.indexOf('-pkg') + 1]), path.join(build, 'sketch.zip'));
  assert.equal(parsed.args[parsed.args.indexOf('-p') + 1], 'TEST_BOOTLOADER_PORT');
  assert.ok(fs.statSync(path.join(build, 'sketch.zip')).size > 1000);
});

test('compiled ELF uses the factory application address and maps exposed GPIO correctly', () => {
  const elf = path.join(build, 'sketch.elf');
  const nm = spawnSync(path.join(gcc, 'arm-none-eabi-nm'), ['-S', elf], { encoding: 'utf8' });
  assert.equal(nm.status, 0, nm.stderr);
  const match = nm.stdout.match(/^([0-9a-f]+)\s+([0-9a-f]+)\s+\w\s+g_ADigitalPinMap$/m);
  assert.ok(match, 'Actual linked pin map must be available');
  const start = parseInt(match[1], 16);
  const dump = spawnSync(path.join(gcc, 'arm-none-eabi-objdump'),
    ['-s', `--start-address=${start}`, `--stop-address=${start + 132}`, elf], { encoding: 'utf8' });
  assert.equal(dump.status, 0, dump.stderr);
  const chunks = dump.stdout.split('\n').flatMap(line => {
    const m = line.match(/^\s+[0-9a-f]+\s+((?:[0-9a-f]{8}\s+){1,4})/);
    return m ? [m[1].replace(/\s/g, '')] : [];
  });
  const pins = Buffer.from(chunks.join(''), 'hex');
  const expected = [2, 3, 28, 29, 4, 5, 43, 44, 45, 46, 47];
  boardJson.digitalPins.forEach(([label, index], i) => {
    assert.equal(pins.readUInt32LE(Number(index) * 4), expected[i], label);
  });
  for (const [label, index] of boardJson.builtinLed) {
    assert.equal(pins.readUInt32LE(Number(index) * 4), { LED_RED: 26, LED_GREEN: 30, LED_BLUE: 6 }[label]);
  }
  const headers = spawnSync(path.join(gcc, 'arm-none-eabi-objdump'), ['-h', elf], { encoding: 'utf8' });
  assert.match(headers.stdout, /\.text\s+[0-9a-f]+\s+00027000\s+00027000/);
  assert.match(nm.stdout, /\bTinyUSBDevice$/m);
  assert.match(nm.stdout, /\btud_cdc_line_state_cb$/m);
});

for (const exitCode of [0, 7]) {
  test(`simulated I/O: real upload.js resets, switches port and propagates tool exit ${exitCode}`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xiao-upload-'));
    try {
      const configPath = path.join(dir, 'upload.json');
      const receipt = path.join(dir, 'events.json');
      fs.writeFileSync(configPath, JSON.stringify({ currentProjectPath: project, buildPath: build,
        appDataPath: appdata, boardModule: '@aily-project/board-xiao_nrf52840_sense',
        portType: 'serial', serialPort: 'TEST_APPLICATION_PORT' }));
      const result = spawnSync(process.execPath, ['--require', path.join(__dirname, 'fixtures/upload-io.cjs'),
        path.join(host, 'child/scripts/upload.js'), configPath], { encoding: 'utf8', timeout: 10000,
        env: { ...process.env, UPLOAD_TEST_RECEIPT: receipt, UPLOAD_TEST_EXIT_CODE: String(exitCode) } });
      assert.equal(result.status, exitCode, result.stdout + result.stderr);
      const events = readJson(receipt);
      assert.deepEqual(events.map(x => x.event), ['list', 'open', 'close', 'list', 'spawn']);
      assert.equal(events[1].baudRate, 1200);
      assert.equal(events[1].path, 'TEST_APPLICATION_PORT');
      const invocation = events.at(-1);
      assert.match(invocation.command, /adafruit-nrfutil/);
      assert.equal(invocation.args[invocation.args.indexOf('-p') + 1], 'TEST_BOOTLOADER_PORT');
      assert.equal(invocation.cwd, build);
      assert.doesNotMatch(result.stderr, /缺少 upload.command/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
}

test('the existing SWD command remains selectable', () => {
  const selection = selectUploadParamForPort(project, 'debugger', boardJson);
  assert.equal(selection.success, true);
  assert.match(selection.uploadParam, /^probe-rs download --chip nRF52840_xxAA/);
});
