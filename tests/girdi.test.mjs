// K-GIRDI · K-BIRIM (yazım ve uzantı ayrımı)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEt } from '../scripts/girdi.mjs';

test('düz alan adı küçük harfe iner, uzantı ayrılır', () => {
  assert.deepEqual(normalizeEt('ZONO.com'), { alan: 'zono.com', etiket: 'zono', uzanti: 'com' });
});

test('şema, yol, www ve sondaki nokta atılır', () => {
  assert.equal(normalizeEt('https://www.zono.com/kisi?a=1').alan, 'zono.com');
  assert.equal(normalizeEt('zono.com.').alan, 'zono.com');
});

test('.tr ikinci seviyesi tek uzantı sayılır', () => {
  assert.deepEqual(normalizeEt('zono.com.tr'), { alan: 'zono.com.tr', etiket: 'zono', uzanti: 'com.tr' });
  assert.deepEqual(normalizeEt('zono.tr'), { alan: 'zono.tr', etiket: 'zono', uzanti: 'tr' });
  // bilinmeyen .tr ikinci seviyesi de olduğu gibi sorulur; kararı TRABİS verir
  assert.equal(normalizeEt('zono.xyz.tr').uzanti, 'xyz.tr');
});

test('Türkçe karakter punycode (xn--) olarak sorgulanır', () => {
  const r = normalizeEt('zonoçarşı.com.tr');
  assert.match(r.alan, /^xn--[a-z0-9-]+\.com\.tr$/);
  assert.equal(r.uzanti, 'com.tr');
});

test('başka ülkenin ikinci seviyesi desteklenmiyor diye işaretlenir', () => {
  assert.equal(normalizeEt('zono.co.uk').desteklenmeyen, true);
});

test('zararlı ve bozuk girdiler reddedilir', () => {
  for (const ham of ['zono.com\r\nfoo.com', '-h evil.com', `${'a'.repeat(64)}.com`, 'zo no.com', 'zono', '', 'zono..com', '-zono.com', 'zono-.com', 'zo\u0000no.com']) {
    assert.ok(normalizeEt(ham).hata, `reddedilmeliydi: ${JSON.stringify(ham)}`);
  }
});
