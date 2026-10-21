const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const workflow = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
const jobs = new Map([...workflow.slice(workflow.indexOf('\njobs:')).matchAll(/^  ([\w-]+):\r?\n([\s\S]*?)(?=^  [\w-]+:|$(?![\s\S]))/gm)]
  .map(([, name, body]) => [name, body]));
const markerGuard = "!contains(github.event.head_commit.message, '[catalog-only]')";

test('catalog-only pushes skip every package, image and deployment-tag writer', () => {
  const direct = ['detect-changes', 'build-and-publish-all', 'publish-registry2-all', 'upload-all-img'];
  const dependent = ['build-and-publish', 'publish-registry2', 'upload-changes-img'];
  assert.deepEqual([...jobs.keys()].sort(), [...direct, ...dependent, 'genJson-and-upload', 'update-last-deploy-tag'].sort());
  for (const name of direct) {
    const header = jobs.get(name).split(/^    steps:/m)[0];
    assert.ok(header.includes(markerGuard), `${name} needs the explicit catalog-only guard`);
  }
  for (const name of dependent) {
    const header = jobs.get(name).split(/^    steps:/m)[0];
    assert.match(header, /^    needs: detect-changes\r?$/m);
    assert.doesNotMatch(header, /always\(\)/);
  }
  const tag = jobs.get('update-last-deploy-tag');
  assert.ok(tag.includes("needs.detect-changes.result == 'success'"));
});

test('catalog-only mode retains the existing generator and trusted upload job', () => {
  const job = jobs.get('genJson-and-upload');
  const header = job.split(/^    steps:/m)[0];
  assert.doesNotMatch(header, /\bneeds:|\bif:/);
  for (const script of ['genjson.js', 'genjson-ai.js', 'generate-info.js --all', 'generate-boards-index.js']) {
    assert.ok(job.includes(`node .scripts/${script}`));
  }
  assert.ok(job.includes('for file in boards.json boards-index.json boards-ai.json'));
  assert.ok(job.includes('secrets.RUSTFS_ENDPOINT'));
  assert.ok(job.includes('secrets.R2_BUCKET'));
  assert.doesNotMatch(job, /npm (?:unpublish|publish)/);
});

test('generic STM32F1 is discoverable without changing its runtime version or dependencies', () => {
  const board = JSON.parse(readFileSync(path.join(root, 'STM32F1/package.json'), 'utf8'));
  assert.equal(board.hide, undefined);
  assert.equal(board.name, '@aily-project/board-stm32f1');
  assert.equal(board.version, '3.0.0');
  assert.equal(board.boardDependencies['@aily-project/sdk-stm32'], '3.0.0');
  assert.equal(board.boardDependencies['@aily-project/compiler-xpack-arm-none-eabi-gcc'], '14.2.1');
});
