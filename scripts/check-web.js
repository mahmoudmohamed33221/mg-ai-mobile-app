// Fails the build if any inline <script> in www/*.html (or any www/*.js) has a JS syntax error.
// This stops a broken edit (for example by the in-app AI) from ever becoming an installable APK.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = false;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function check(code, name) {
  try {
    new vm.Script(code, { filename: name });
  } catch (e) {
    failed = true;
    console.error('SYNTAX ERROR in ' + name + ': ' + e.message);
  }
}

if (!fs.existsSync('www/index.html')) {
  console.error('www/index.html is missing');
  process.exit(1);
}

for (const file of walk('www')) {
  if (/\.js$/i.test(file)) {
    check(fs.readFileSync(file, 'utf8'), file);
  } else if (/\.html?$/i.test(file)) {
    const html = fs.readFileSync(file, 'utf8');
    const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
    let m, i = 0;
    while ((m = re.exec(html))) {
      const attrs = m[1] || '';
      if (/\bsrc\s*=/.test(attrs)) continue;
      const t = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
      if (t && !/^(text|application)\/javascript$/i.test(t)) continue;
      check(m[2], file + ' <script #' + (++i) + '>');
    }
  }
}

if (failed) process.exit(1);
console.log('Web code syntax check passed.');
