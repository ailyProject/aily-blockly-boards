'use strict';

// Only the hardware/process boundary is simulated. The host runs its real upload.js.
const fs = require('node:fs');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const originalLoad = Module._load;
const events = [];
let lists = 0;
const save = () => fs.writeFileSync(process.env.UPLOAD_TEST_RECEIPT, JSON.stringify(events));

class SerialPort {
  constructor(options) { this.options = options; }
  static async list() {
    events.push({ event: 'list' });
    save();
    return [{ path: ++lists === 1 ? 'TEST_APPLICATION_PORT' : 'TEST_BOOTLOADER_PORT' }];
  }
  open(callback) {
    events.push({ event: 'open', ...this.options });
    save();
    callback(null);
  }
  close(callback) { events.push({ event: 'close' }); save(); callback(null); }
}

Module._load = function (request, parent, isMain) {
  if (request === 'serialport' || /[/\\]serialport(?:[/\\]dist)?$/.test(request)) {
    return { SerialPort };
  }
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request !== 'child_process') return loaded;
  return { ...loaded, spawn(command, args, options) {
    events.push({ event: 'spawn', command, args, cwd: options.cwd });
    save();
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    setImmediate(() => child.emit('close', Number(process.env.UPLOAD_TEST_EXIT_CODE), null));
    return child;
  } };
};
