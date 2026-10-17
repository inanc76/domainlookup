// Canlı ölçütler — gerçek sunuculara gider; CI'da KOŞMAZ. Kullanım: npm run canli
// Ağa ulaşılamazsa testler atlanır: bu ÖLÇÜLEMEDİ demektir, yeşil değil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calistir } from '../../scripts/domainlookup.mjs';
import { sorgulaHepsi } from '../../scripts/sorgu.mjs';
import { premiumBak } from '../../scripts/premium.mjs';
import { gercekAg } from '../../scripts/ag.mjs';
import { geciciKlasor } from '../yardimci.mjs';

const ag = gercekAg();
const ulasilir = await ag.http('https://data.iana.org/TLD/tlds-alpha-by-domain.txt').then((c) => c.status === 200, () => false);
const t = (ad, fn) => test(ad, { skip: ulasilir ? false : 'ÖLÇÜLEMEDİ — ağa ulaşılamadı' }, fn);
const rastgele = `zonoyok${Date.now().toString(36)}`;

async function sor(adlar) {
  const k = geciciKlasor();
  try { return await sorgulaHepsi(adlar, { ag, veriKlasoru: k.yol }); } finally { k.sil(); }
}
async function kos(argv) {
  const k = geciciKlasor();
  try { return await calistir(argv, { ag, veriKlasoru: k.yol }); } finally { k.sil(); }
}

t('K-TR canlı: boş · dolu · olmayan ikinci seviye', async () => {
  const [bos, dolu, yok] = await sor([`${rastgele}.com.tr`, 'mediaclick.com.tr', 'zono.xyz.tr']);
  assert.equal(bos.durum, 'BOS', JSON.stringify(bos));
  assert.equal(dolu.durum, 'DOLU', JSON.stringify(dolu));
  assert.equal(yok.durum, 'UZANTI_YOK', JSON.stringify(yok));
});

t('K-COM canlı: zono.com dolu, rastgele .com boş', async () => {
  const [dolu, bos] = await sor(['zono.com', `${rastgele}.com`]);
  assert.equal(dolu.durum, 'DOLU');
  assert.equal(bos.durum, 'BOS', JSON.stringify(bos));
});

t('K-UZANTI canlı: zono.zzzz yok · zono.data ve foo.search kapalı · zono.kim açık', async () => {
  const r = await sor(['zono.zzzz', 'zono.data', 'foo.search', `${rastgele}.kim`]);
  assert.deepEqual(r.map((x) => x.durum), ['UZANTI_YOK', 'KAYDA_KAPALI', 'KAYDA_KAPALI', 'BOS']);
});

t('K-PREMIUM canlı: love.dev premium · rastgele .com standart', async () => {
  const m = await premiumBak(['love.dev', `${rastgele}.com`], { ag });
  assert.equal(m.get('love.dev'), 'premium');
  assert.equal(m.get(`${rastgele}.com`), 'standart');
});

t('K-ALTERNATIF canlı: zono.data → numaralı liste, dolu satırda whoisN', async () => {
  const r = await kos(['zono.data']);
  assert.match(r.metin, /^1\. zono\.data — ⛔ kayda kapalı/m);
  assert.match(r.metin, /^2\. zono\.com — ❌ dolu — WHOIS için "whois2" yazın/m);
});

t('K-WHOIS canlı: zono.com ve mediaclick.com.tr kaydı', async () => {
  const a = await kos(['whois', 'zono.com']);
  assert.match(a.metin, /Network Solutions/);
  assert.match(a.metin, /\| Kayıt tarihi \| 1995-12-08 \|/);
  const b = await kos(['whois', 'mediaclick.com.tr']);
  assert.match(b.metin, /\| Kayıt tarihi \| 2011-03-02 \|/);
  assert.match(b.metin, /cloudflare/);
});
