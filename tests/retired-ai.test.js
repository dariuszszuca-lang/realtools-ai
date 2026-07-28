const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['invest.html', 'pum.html']) {
  test(`${file} nie wywołuje usuniętego backendu AI`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

    assert.doesNotMatch(html, /29m11nzej9/);
    assert.doesNotMatch(html, /fetch\(RCT_API/);
  });

  test(`${file} wyjaśnia, że analiza AI jest wyłączona`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

    assert.match(html, /Analiza AI jest czasowo niedostępna/);
  });
}

