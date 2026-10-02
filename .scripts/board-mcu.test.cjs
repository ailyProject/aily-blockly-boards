const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const boards = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
  .map(entry => ({ directory: entry.name, file: path.join(root, entry.name, 'board.json') }))
  .filter(entry => fs.existsSync(entry.file))
  .map(entry => ({ ...entry, board: JSON.parse(fs.readFileSync(entry.file, 'utf8')) }));
const board = directory => boards.find(entry => entry.directory === directory).board;

test('optional MCU declarations are portable chip identifiers', () => {
  const declared = boards.filter(entry => Object.hasOwn(entry.board, 'mcu'));
  assert.ok(declared.length > 0);
  for (const entry of declared) {
    assert.equal(typeof entry.board.mcu, 'string', entry.file);
    assert.match(entry.board.mcu, /^[a-z0-9][a-z0-9._+-]{0,63}$/, entry.file);
  }
});

test('ESP32 packages declare MCU independently of vendor/board aliases', () => {
  for (const entry of boards.filter(entry => entry.board.type?.split(':')[1] === 'esp32')) {
    assert.match(entry.board.mcu || '', /^esp32(?:[schp]\d+)?$/, entry.file);
  }
  for (const [directory, expected] of Object.entries({
    oj_wifiduino32: 'esp32', oj_wifiduino_v2: 'esp32c3', oj_wifiduino32s3: 'esp32s3',
    arduino_nano_esp32: 'esp32s3', m5stack_core2: 'esp32', m5stack_tab5: 'esp32p4',
    df_unihiker_k10: 'esp32s3', xiao_esp32c5: 'esp32c5', seekfree_robot: 'esp32s3',
    aithinker_esp32_cam: 'esp32', esp_mosaico: 'esp32s31', other_esp32p4_robot_lite: 'esp32p4',
  })) assert.equal(board(directory).mcu, expected, directory);
});

test('the declaration works for non-ESP32 packages too', () => {
  assert.equal(board('arduino_uno').mcu, 'atmega328p');
  assert.equal(board('arduino_leonardo').mcu, 'atmega32u4');
  assert.equal(board('arduino_mega').mcu, 'atmega2560');
  assert.equal(board('oj_mega_pro').mcu, 'atmega2560');
});

test('fixed STM32 board declarations match the board package target, not SDK CPU architecture', () => {
  const targets = {
    nucleo_f401re: 'stm32f401re', nucleo_f446re: 'stm32f446re',
    nucleo_g431rb: 'stm32g431rb', nucleo_h563zi: 'stm32h563zi',
    oj_stm32f103c8_nano: 'stm32f103c8',
    stm32c011f6: 'stm32c011f6', stm32c031c6: 'stm32c031c6', stm32c051c8: 'stm32c051c8',
    stm32f103c8: 'stm32f103c8', stm32f103rc: 'stm32f103rc', stm32f103re: 'stm32f103re',
    stm32f103vc: 'stm32f103vc', stm32f103ze: 'stm32f103ze',
    stm32f407ve: 'stm32f407ve', stm32f407vg: 'stm32f407vg',
    stm32f407ze: 'stm32f407ze', stm32f407zg: 'stm32f407zg',
  };
  for (const [directory, expected] of Object.entries(targets)) {
    assert.equal(board(directory).mcu, expected, directory);
    const template = JSON.parse(fs.readFileSync(path.join(root, directory, 'template/package.json'), 'utf8'));
    assert.ok(template.projectConfig.pnum.toLowerCase().includes(expected.slice('stm32'.length)), directory);
  }
});

test('menu-selectable MCU families do not claim a fixed model without selection support', () => {
  assert.equal(board('arduino_nano').mcu, undefined);
  for (const entry of boards.filter(entry => entry.directory.startsWith('STM32'))) {
    assert.equal(entry.board.mcu, undefined, entry.directory);
  }
});
