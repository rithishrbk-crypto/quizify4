// Builds the static site into public/: quiz data for the browser + HTML pages with static mode enabled.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');

fs.writeFileSync(path.join(pub, 'js', 'seed-data.js'), 'window.QUIZIFY_QUIZZES = ' + JSON.stringify(require('../lib/seed')()) + ';\n');
const tag = '<script src="/js/common.js"></script>';
for (const f of fs.readdirSync(path.join(root, 'views'))) {
  let html = fs.readFileSync(path.join(root, 'views', f), 'utf8');
  if (f !== 'index.html') html = html.replace(tag, tag + '<script src="/js/seed-data.js"></script><script src="/js/static-api.js"></script>');
  fs.writeFileSync(path.join(pub, f), html);
}
console.log('Static site built in public/');
