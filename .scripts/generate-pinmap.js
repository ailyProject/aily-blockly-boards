const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ============ Chip-specific knowledge ============

// Default UART TX/RX pins per chip type (using underlying pin value/number)
const UART_DEFAULTS = {
  esp32:      [{ tx: '1', rx: '3' }, { tx: '17', rx: '16' }],
  esp32s2:    [{ tx: '43', rx: '44' }],
  esp32s3:    [{ tx: '43', rx: '44' }],
  esp32c3:    [{ tx: '21', rx: '20' }],
  esp32c6:    [{ tx: '16', rx: '17' }],
  esp32h2:    [{ tx: '24', rx: '23' }],
  esp32p4:    [{ tx: '37', rx: '38' }],
  atmega328p: [{ tx: '1', rx: '0' }],
  atmega32u4: [{ tx: '1', rx: '0' }],
  atmega2560: [{ tx: '1', rx: '0' }],
  sam3x8e:    [{ tx: '1', rx: '0' }],
  rp2040:     [{ tx: '0', rx: '1' }],
  rp2350:     [{ tx: '0', rx: '1' }],
  stm32:      [{ tx: 'PA9', rx: 'PA10' }, { tx: 'PA2', rx: 'PA3' }],
  nrf52840:   [],
  renesas:    [],
};

// Touch pin mappings: chip → { gpioValueStr: touchDisplayName }
const TOUCH_PINS = {
  esp32: {
    '4': 'TOUCH0', '0': 'TOUCH1', '2': 'TOUCH2', '15': 'TOUCH3',
    '13': 'TOUCH4', '12': 'TOUCH5', '14': 'TOUCH6', '27': 'TOUCH7',
    '33': 'TOUCH8', '32': 'TOUCH9'
  },
  esp32s2: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [String(i + 1), `TOUCH${i + 1}`])),
  esp32s3: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [String(i + 1), `TOUCH${i + 1}`])),
};

// Standard functionType definitions
const ALL_FUNC_TYPES = [
  { value: 'power',   label: 'VCC',     color: '#EF4444', textColor: '#FFFFFF' },
  { value: 'gnd',     label: 'GND',     color: '#000000', textColor: '#FFFFFF' },
  { value: 'digital', label: 'Digital', color: '#3B82F6', textColor: '#FFFFFF' },
  { value: 'analog',  label: 'Analog',  color: '#10B981', textColor: '#FFFFFF' },
  { value: 'uart',    label: 'UART',    color: '#F59E0B', textColor: '#FFFFFF' },
  { value: 'i2c',     label: 'I2C',     color: '#8B5CF6', textColor: '#FFFFFF' },
  { value: 'spi',     label: 'SPI',     color: '#EC4899', textColor: '#FFFFFF' },
  { value: 'pwm',     label: 'PWM',     color: '#FCD34D', textColor: '#000000' },
  { value: 'other',   label: 'Other',   color: '#9CA3AF', textColor: '#FFFFFF' },
  { value: 'gpio',    label: 'GPIO',    color: '#e6d200', textColor: '#FFFFFF' },
  { value: 'adc',     label: 'ADC',     color: '#007539', textColor: '#FFFFFF' },
  { value: 'touch',   label: 'TOUCH',   color: '#f98062', textColor: '#FFFFFF' },
];

// Base function types always included
const BASE_TYPES = new Set(['power', 'gnd', 'digital', 'analog', 'uart', 'i2c', 'spi', 'pwm', 'other']);

// ============ Chip detection ============

function getChipType(board) {
  const type = (board.type || '').toLowerCase();
  const core = (board.core || '').toLowerCase();
  const upload = (board.uploadParam || '').toLowerCase();

  // ESP32 family — check specific variants first (order matters)
  if (type.includes('esp32p4') || upload.includes('esp32p4')) return 'esp32p4';
  if (type.includes('esp32s3') || upload.includes('esp32s3')) return 'esp32s3';
  if (type.includes('esp32s2') || upload.includes('esp32s2')) return 'esp32s2';
  if (type.includes('esp32c3') || upload.includes('esp32c3')) return 'esp32c3';
  if (type.includes('esp32c6') || upload.includes('esp32c6')) return 'esp32c6';
  if (type.includes('esp32h2') || upload.includes('esp32h2')) return 'esp32h2';
  if (core.includes('esp32') || type.includes('esp32')) return 'esp32';

  // STM32 (check before AVR because "STMicroelectronics" contains "micro")
  if (core.includes('stm32') || type.includes('stm32')) return 'stm32';

  // Arduino AVR
  if (type.includes(':mega') || type.endsWith('mega')) return 'atmega2560';
  if (type.includes(':leonardo') || type.includes(':micro')) return 'atmega32u4';
  if (core.includes('avr')) return 'atmega328p';

  // Arduino SAM (Due)
  if (type.includes('due') || core.includes('sam')) return 'sam3x8e';

  // RP2350 (check before RP2040)
  if (core.includes('rp2350') || type.includes('rp2350') || upload.includes('rp2350')) return 'rp2350';

  // RP2040
  if (core.includes('rp2040') || type.includes('rp2040') || upload.includes('rp2040')) return 'rp2040';

  // nRF52
  if (core.includes('nrf52') || type.includes('nrf52')) return 'nrf52840';

  // Renesas
  if (core.includes('renesas') || type.includes('renesas')) return 'renesas';

  return 'unknown';
}

const ESP_CHIPS = ['esp32', 'esp32s2', 'esp32s3', 'esp32c3', 'esp32c6', 'esp32h2', 'esp32p4'];

function isNumStr(v) {
  return /^-?\d+$/.test(String(v));
}

// ============ Pin collection ============

function generatePinmap(dirName, board, packageJson) {
  const chipType = getChipType(board);
  const boardName = board.name || (packageJson && packageJson.nickname) || dirName;
  const packageName = (packageJson && packageJson.name) || `@aily-project/board-${dirName}`;
  const isEsp = ESP_CHIPS.includes(chipType);

  // pinMap: valueKey(string) → { label, value, functions: [{name, type}] }
  const pinMap = new Map();

  function ensurePin(label, value) {
    const key = String(value);
    if (!pinMap.has(key)) {
      pinMap.set(key, { label: String(label), value: key, functions: [] });
    }
    return pinMap.get(key);
  }

  function addFunc(key, name, type) {
    const pin = pinMap.get(key);
    if (!pin) return;
    if (pin.functions.some(f => f.name === name && f.type === type)) return;
    pin.functions.push({ name, type });
  }

  // Find pin key by reference (could be value or label)
  function findKey(ref) {
    const s = String(ref);
    if (pinMap.has(s)) return s;
    for (const [k, p] of pinMap) {
      if (p.label === s) return k;
    }
    return null;
  }

  // --- 1. Digital pins ---
  if (board.digitalPins) {
    for (const [label, value] of board.digitalPins) {
      if (['LED_BUILTIN', 'RGB_BUILTIN'].includes(label)) continue;
      ensurePin(label, value);
      addFunc(String(value), label, 'digital');
    }
  }

  // --- 2. Analog pins ---
  if (board.analogPins) {
    for (const [label, value] of board.analogPins) {
      if (['ADC_BAT', 'BAT_DET_PIN'].includes(label)) continue;
      const key = String(value);
      ensurePin(label, value);
      addFunc(key, label, 'analog');
    }
  }

  // --- 3. I2C pins ---
  if (board.i2cPins) {
    for (const [wireName, pinPairs] of Object.entries(board.i2cPins)) {
      const suffix = wireName === 'Wire' ? '' : wireName.replace('Wire', '');
      for (const [funcLabel, pinRef] of pinPairs) {
        const key = findKey(pinRef);
        if (key) {
          addFunc(key, suffix ? `${funcLabel}${suffix}` : funcLabel, 'i2c');
        }
      }
    }
  }

  // --- 4. SPI pins ---
  if (board.spiPins) {
    for (const [spiName, pinPairs] of Object.entries(board.spiPins)) {
      for (const [funcLabel, pinRef] of pinPairs) {
        const key = findKey(pinRef);
        if (key) {
          addFunc(key, funcLabel, 'spi');
        }
      }
    }
  }

  // --- 5. UART (chip-specific defaults) ---
  const uartDefs = UART_DEFAULTS[chipType] || [];
  for (let i = 0; i < uartDefs.length; i++) {
    const { tx, rx } = uartDefs[i];
    const suffix = i === 0 ? '' : String(i);
    const txKey = findKey(tx);
    const rxKey = findKey(rx);
    if (txKey) addFunc(txKey, `TX${suffix}`, 'uart');
    if (rxKey) addFunc(rxKey, `RX${suffix}`, 'uart');
  }

  // --- 6. GPIO label (ESP32 family with numeric pin values) ---
  if (isEsp) {
    for (const [key, pin] of pinMap) {
      if (isNumStr(key)) {
        addFunc(key, `GPIO${key}`, 'gpio');
      }
    }
  }

  // --- 7. Touch pins (ESP32 / S2 / S3) ---
  const touchMap = TOUCH_PINS[chipType] || {};
  for (const [gpioVal, touchName] of Object.entries(touchMap)) {
    if (pinMap.has(gpioVal)) {
      addFunc(gpioVal, touchName, 'touch');
    }
  }

  // ============ Sort pins ============
  const signalPins = Array.from(pinMap.values());
  signalPins.sort((a, b) => {
    const an = parseInt(a.value, 10);
    const bn = parseInt(b.value, 10);
    if (!isNaN(an) && !isNaN(bn)) return an - bn;
    if (!isNaN(an)) return -1;
    if (!isNaN(bn)) return 1;
    return a.value.localeCompare(b.value);
  });

  // ============ Power / GND pins ============
  const powerEntries = [];
  const isAvr = ['atmega328p', 'atmega32u4', 'atmega2560'].includes(chipType);
  const isSam = chipType === 'sam3x8e';
  const isRp = ['rp2040', 'rp2350'].includes(chipType);
  const isStm = chipType === 'stm32';

  if (isAvr || isSam) {
    powerEntries.push({ name: '5V', type: 'power' }, { name: '3V3', type: 'power' }, { name: 'VIN', type: 'power' });
    powerEntries.push({ name: 'GND', type: 'gnd' }, { name: 'GND', type: 'gnd' });
  } else if (isEsp) {
    powerEntries.push({ name: '3V3', type: 'power' }, { name: '5V', type: 'power' });
    powerEntries.push({ name: 'GND', type: 'gnd' }, { name: 'GND', type: 'gnd' });
  } else if (isRp) {
    powerEntries.push({ name: '3V3', type: 'power' }, { name: 'VSYS', type: 'power' });
    powerEntries.push({ name: 'GND', type: 'gnd' }, { name: 'GND', type: 'gnd' });
  } else if (isStm) {
    powerEntries.push({ name: '3V3', type: 'power' }, { name: '5V', type: 'power' });
    powerEntries.push({ name: 'GND', type: 'gnd' }, { name: 'GND', type: 'gnd' });
  } else {
    powerEntries.push({ name: '3V3', type: 'power' });
    powerEntries.push({ name: 'GND', type: 'gnd' });
  }

  // ============ Layout ============
  const halfLen = Math.ceil(signalPins.length / 2);
  const leftSignal = signalPins.slice(0, halfLen);
  const rightSignal = signalPins.slice(halfLen);

  // Left: power pins on top, then first half of signals
  const leftItems = [
    ...powerEntries.map(p => ({ functions: [{ name: p.name, type: p.type }] })),
    ...leftSignal.map(p => ({ functions: p.functions })),
  ];
  // Right: second half of signals
  const rightItems = rightSignal.map(p => ({ functions: p.functions }));

  const maxRows = Math.max(leftItems.length, rightItems.length);
  const spacing = 20;
  const startY = 30;
  const boardWidth = 300;
  const boardHeight = Math.max(maxRows * spacing + 60, 200);

  const pinObjects = [];
  let pinId = 1;

  // Left column
  for (let i = 0; i < leftItems.length; i++) {
    const y = startY + i * spacing;
    pinObjects.push({
      id: `pin_${pinId++}`,
      x: 15,
      y,
      labelX: -15,
      labelY: y - 7,
      layout: 'horizontal',
      functions: leftItems[i].functions.map(f => ({
        name: f.name, type: f.type, visible: true, disabled: false,
      })),
      visible: true,
      disabled: false,
      labelAnchor: 'right',
    });
  }

  // Right column
  for (let i = 0; i < rightItems.length; i++) {
    const y = startY + i * spacing;
    pinObjects.push({
      id: `pin_${pinId++}`,
      x: boardWidth - 15,
      y,
      labelX: boardWidth + 15,
      labelY: y - 7,
      layout: 'horizontal',
      functions: rightItems[i].functions.map(f => ({
        name: f.name, type: f.type, visible: true, disabled: false,
      })),
      visible: true,
      disabled: false,
    });
  }

  // ============ Determine functionTypes to include ============
  const usedTypes = new Set();
  pinObjects.forEach(p => p.functions.forEach(f => usedTypes.add(f.type)));

  const functionTypes = ALL_FUNC_TYPES.filter(
    ft => usedTypes.has(ft.value) || BASE_TYPES.has(ft.value)
  );

  // ============ Build the pinmap object ============
  const ts = Date.now() + Math.floor(Math.random() * 100000);

  return {
    id: `component_${ts}`,
    name: boardName,
    width: boardWidth,
    height: boardHeight,
    images: [
      {
        id: `img_${ts + 1}`,
        name: `Image_${ts + 1}`,
        width: boardWidth,
        height: boardHeight,
        x: 0,
        y: 0,
        aspectRatio: +(boardWidth / boardHeight).toFixed(6),
        visible: true,
        disabled: false,
        locked: true,
      },
    ],
    pins: pinObjects,
    texts: [],
    rects: [],
    ellipses: [],
    lines: [],
    functionTypes,
    visible: true,
    disabled: false,
    board: packageName,
  };
}

// ============ Main ============

// Original directories that had pinmap.json before this script
const ORIGINAL_PINMAP_DIRS = new Set([
  'arduino_uno', 'arduino_uno_r4_wifi', 'arduino_uno_r4_minima',
  'xiao_esp32s3', 'oj_uno_r3_pro',
]);

function main() {
  const force = process.argv.includes('--force');

  // Collect directories that should be skipped
  const skipDirs = new Set();
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const d = entry.name;
    // Always skip dirs with pinmap.webp (they have real board images)
    if (fs.existsSync(path.join(ROOT, d, 'pinmap.webp'))) {
      skipDirs.add(d);
    }
    // Skip original pinmap.json dirs
    if (ORIGINAL_PINMAP_DIRS.has(d)) {
      skipDirs.add(d);
    }
    // Without force, also skip any dir that already has pinmap.json
    if (!force && fs.existsSync(path.join(ROOT, d, 'pinmap.json'))) {
      skipDirs.add(d);
    }
  }

  let generated = 0;
  let skipped = 0;
  const results = [];

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = entry.name;
    if (skipDirs.has(dir)) continue;

    const boardPath = path.join(ROOT, dir, 'board.json');
    if (!fs.existsSync(boardPath)) {
      skipped++;
      continue;
    }

    try {
      const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
      let pkg = {};
      const pkgPath = path.join(ROOT, dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      }

      const pinmap = generatePinmap(dir, board, pkg);
      const outPath = path.join(ROOT, dir, 'pinmap.json');
      fs.writeFileSync(outPath, JSON.stringify(pinmap, null, 2));

      const chip = getChipType(board);
      results.push(`  ${dir} (${pinmap.pins.length} pins, ${chip})`);
      generated++;
    } catch (err) {
      console.error(`ERROR ${dir}: ${err.message}`);
      skipped++;
    }
  }

  console.log('Generated pinmap.json for:');
  results.forEach(r => console.log(r));
  console.log(`\nTotal generated: ${generated}, Skipped (no board.json): ${skipped}`);
}

main();
