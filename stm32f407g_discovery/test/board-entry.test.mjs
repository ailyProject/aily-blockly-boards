import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const json = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const [pkg, board, menu, template] = await Promise.all(
  ['package.json', 'board.json', 'menu.json', 'template/package.json'].map(json));

test('Discovery has one independent normal npm board and exact native SDK menu', () => {
  assert.equal(pkg.name, '@aily-project/board-stm32f407g-discovery');
  assert.equal(pkg.version, '3.0.0');
  assert.equal(pkg.boardDependencies['@aily-project/sdk-stm32'], pkg.version);
  assert.equal(template.board, pkg.nickname);
  assert.deepEqual(Object.entries(template.dependencies).filter(([name]) => name.startsWith('@aily-project/board-')),
    [[pkg.name, pkg.version]]);
  assert.equal(board.type, 'STMicroelectronics:stm32:Disco');
  assert.equal(board.compilerParam, `compile -v -b ${board.type}`);
  assert.deepEqual(template.projectConfig, { pnum: 'DISCO_F407VG' });
  const pnum = menu.find(item => item.key === 'pnum');
  assert.equal(pnum.extra.optionNameIncludes, 'STM32F407G-DISC1');
  assert.equal(pnum.extra.syncPinConfig, true);
});

test('Discovery defaults use its own variant, not Black or generic F407 aliases', () => {
  assert.deepEqual(board.serialPins, { Serial: [['RX', 'PA3'], ['TX', 'PA2']] });
  assert.deepEqual(board.i2cPins, { Wire: [['SDA', 'PB7'], ['SCL', 'PB8']] });
  assert.deepEqual(board.spiPins, { SPI: [['MOSI', 'PA7'], ['MISO', 'PA6'], ['SCK', 'PA5'], ['SS', 'PB12']] });
  assert.deepEqual(board.builtinButton, [['USER_BTN', 'PA0']]);
  assert.deepEqual(board.builtinLed.map(([, pin]) => pin), ['PD12', 'PD13', 'PD14', 'PD15']);
  const digital = new Set(board.digitalPins.map(([, pin]) => pin));
  assert.equal(digital.size, 77);
  assert.deepEqual(board.interruptPins, board.digitalPins);
  for (const unavailable of ['PH0', 'PH1', 'PA11', 'PA12', 'PA14']) assert.equal(digital.has(unavailable), false);
  for (const [, pin] of [...board.analogPins, ...board.pwmPins]) assert.ok(digital.has(pin), pin);
});

test('installed SDK evidence agrees with native menu, exact digital macros and default buses',
  { skip: !process.env.STM32_SDK_PATH }, async () => {
    const sdk = path.resolve(process.env.STM32_SDK_PATH);
    const boards = await readFile(path.join(sdk, 'boards.txt'), 'utf8');
    const variantDirectory = 'STM32F4xx/F407V(E-G)T_F417V(E-G)T';
    const variant = await readFile(path.join(sdk, 'variants', variantDirectory, 'variant_DISCO_F407VG.h'), 'utf8');
    const peripheralPins = await readFile(path.join(sdk, 'variants', variantDirectory, 'PeripheralPins.c'), 'utf8');
    assert.match(boards, /^Disco\.menu\.pnum\.DISCO_F407VG=STM32F407G-DISC1\r?$/mu);
    assert.match(boards, /^Disco\.menu\.pnum\.DISCO_F407VG\.build\.variant=STM32F4xx\/F407V\(E-G\)T_F417V\(E-G\)T\r?$/mu);
    const macros = [...variant.matchAll(/^#define\s+(P[A-E]\d+)\s+(?:PIN_A\d+|\d+)\s*$/gmu)].map(match => match[1]);
    assert.deepEqual(board.digitalPins.map(([, pin]) => pin).sort(), macros.sort());
    const timerTable = peripheralPins.match(/PinMap_TIM\[\]\s*=\s*\{([\s\S]*?)\};/u)?.[1];
    assert.ok(timerTable);
    const timerPins = new Set([...timerTable.matchAll(/\{(P[A-E])_(\d+)(?:_ALT\d+)?,\s*TIM\d+,/gu)]
      .map(match => `${match[1]}${match[2]}`).filter(pin => macros.includes(pin)));
    assert.deepEqual(board.pwmPins.map(([, pin]) => pin).sort(), [...timerPins].sort());
    for (const [macro, pin] of [
      ['PIN_SERIAL_RX', 'PA3'], ['PIN_SERIAL_TX', 'PA2'], ['PIN_WIRE_SDA', 'PB7'], ['PIN_WIRE_SCL', 'PB8'],
      ['PIN_SPI_MOSI', 'PA7'], ['PIN_SPI_MISO', 'PA6'], ['PIN_SPI_SCK', 'PA5'], ['PIN_SPI_SS', 'PB12'],
      ['USER_BTN', 'PA0'], ['LED_GREEN', 'PD12'],
    ]) assert.match(variant, new RegExp(`^\\s*#define\\s+${macro}\\s+${pin}\\s*$`, 'mu'));
  });
