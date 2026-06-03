const assert = require('assert');
const { formatToE164 } = require('../src/utils/phoneFormatter');

const cases = [
  { in: '03377005333', out: '+923377005333' },
  { in: '3377005333', out: '+923377005333' },
  { in: '+923377005333', out: '+923377005333' },
  { in: '00923377005333', out: '+923377005333' },
  { in: '0337 700-5333', out: '+923377005333' },
  { in: '123', out: null },
  { in: '', out: null },
  { in: null, out: null },
];

let failed = 0;
for (const c of cases) {
  try {
    const res = formatToE164(c.in);
    assert.strictEqual(res, c.out, `Input: ${JSON.stringify(c.in)} → Expected ${c.out} but got ${res}`);
    console.log('OK:', c.in, '→', res);
  } catch (err) {
    failed++;
    console.error('FAIL:', err.message);
  }
}

if (failed > 0) {
  console.error(`${failed} test(s) failed`);
  process.exit(1);
}

console.log('All phoneFormatter tests passed');
process.exit(0);
