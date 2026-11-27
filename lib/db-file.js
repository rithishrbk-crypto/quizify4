// Tiny JSON "database": async, atomic writes, per-file queue, corruption recovery.
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const defaults = {
  users: () => [],
  attempts: () => [],
  quizzes: () => require('./seed')(),
};
const queues = new Map();
const fileOf = (name) => path.join(DATA_DIR, `${name}.json`);

// Operations on the same file run one at a time, so read-modify-write cycles never overlap.
function enqueue(name, task) {
  const prev = queues.get(name) || Promise.resolve();
  const next = prev.then(task, task);
  queues.set(name, next.catch(() => {}));
  return next;
}

async function writeRaw(name, data) {
  const file = fileOf(name);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file); // atomic replace: a crash never leaves a half-written file
}

async function readRaw(name) {
  const file = fileOf(name);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const fresh = defaults[name]();
    await writeRaw(name, fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
    return parsed;
  } catch (err) {
    // Keep the unreadable file for manual recovery instead of overwriting it.
    const backup = `${file}.corrupt-${Date.now()}`;
    await fs.rename(file, backup);
    console.error(`[db] ${name}.json was unreadable (${err.message}). Backed up to ${path.basename(backup)} and recreated.`);
    const fresh = defaults[name]();
    await writeRaw(name, fresh);
    return fresh;
  }
}

exports.init = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const name of Object.keys(defaults)) await enqueue(name, () => readRaw(name));
};
exports.read = (name) => enqueue(name, () => readRaw(name));
// fn mutates the array in place and may return a value. If fn throws, nothing is written.
exports.update = (name, fn) =>
  enqueue(name, async () => {
    const data = await readRaw(name);
    const result = await fn(data);
    await writeRaw(name, data);
    return result;
  });
