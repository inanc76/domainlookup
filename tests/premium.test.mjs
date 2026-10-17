// K-PREMIUM · K-GODADDY-TR
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiumBak } from '../scripts/premium.mjs';
import { standartAg, fikstur } from './yardimci.mjs';

test('K-PREMIUM: love.dev premium, zonokim.com standart', async () => {
  const m = await premiumBak(['love.dev', 'zonokim.com'], { ag: standartAg() });
  assert.equal(m.get('love.dev'), 'premium');
  assert.equal(m.get('zonokim.com'), 'standart');
});

test('K-GODADDY-TR: .tr ailesi GoDaddy\'ye hiç gönderilmez, aynı partideki .com gönderilir', async () => {
  const ag = standartAg();
  const m = await premiumBak(['zonokim.com.tr', 'zonokim.tr', 'zono.net.tr', 'zonokim.com'], { ag });
  const giden = ag.cagrilar.filter((c) => c.url?.includes('godaddy')).map((c) => JSON.parse(c.govde).params.arguments.domains);
  assert.deepEqual(giden, ['zonokim.com']);
  for (const ad of ['zonokim.com.tr', 'zonokim.tr', 'zono.net.tr']) assert.equal(m.get(ad), null, ad);
  assert.equal(m.get('zonokim.com'), 'standart');
});

test('GoDaddy tam eşleşme satırı vermezse premium ölçülmedi (null)', async () => {
  // canlı cevap: zonokim.com.tr sorgusu — tam eşleşme satırı yok, "unavailable"
  const ag = standartAg({ http: { 'api.godaddy.com': { govde: fikstur('godaddy-tr.txt') } } });
  const m = await premiumBak(['zonokim.dev'], { ag });
  assert.equal(m.get('zonokim.dev'), null);
});

test('GoDaddy hatası premium ölçülmedi yapar, istisna fırlatmaz', async () => {
  const ag = standartAg({ http: { 'api.godaddy.com': new Error('ECONNRESET') } });
  const m = await premiumBak(['zonokim.com'], { ag });
  assert.equal(m.get('zonokim.com'), null);
});
