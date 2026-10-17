// K-TR · K-COM · K-UZANTI · K-KONTROL · K-BELIRSIZ · K-GIRDI (ağ sayacı)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sorgulaHepsi } from '../scripts/sorgu.mjs';
import { standartAg, sahteAg, geciciKlasor, fikstur, jsonFikstur } from './yardimci.mjs';

async function sor(adlar, ag = standartAg()) {
  const k = geciciKlasor();
  try {
    return await sorgulaHepsi([].concat(adlar), { ag, veriKlasoru: k.yol });
  } finally {
    k.sil();
  }
}
const tek = async (ad, ag) => (await sor(ad, ag))[0];

test('K-TR: dolu .com.tr → DOLU (TRABİS)', async () => {
  const r = await tek('mediaclick.com.tr');
  assert.equal(r.durum, 'DOLU');
  assert.equal(r.sunucu, 'whois.trabis.gov.tr');
});

test('K-TR: boş .com.tr → BOS', async () => {
  const r = await tek('zonoyokxyz.com.tr');
  assert.equal(r.durum, 'BOS');
  assert.equal(r.kaynak, 'whois');
});

test('K-TR: olmayan .tr ikinci seviyesi → UZANTI_YOK', async () => {
  assert.equal((await tek('zono.xyz.tr')).durum, 'UZANTI_YOK');
});

test('K-COM: ad sunucusu olan .com → DOLU', async () => {
  assert.equal((await tek('zono.com')).durum, 'DOLU');
});

test('K-COM: ad sunucusu yok + Verisign 404 → BOS (RDAP)', async () => {
  const r = await tek('zonoyokxyz.com');
  assert.equal(r.durum, 'BOS');
  assert.equal(r.kaynak, 'rdap');
});

test('K-UZANTI: IANA listesinde olmayan uzantı → UZANTI_YOK, kayıt sorgusu yok', async () => {
  const ag = standartAg();
  assert.equal((await tek('zono.zzzz', ag)).durum, 'UZANTI_YOK');
  assert.ok(!ag.cagrilar.some((c) => c.tur === 'whois' || /\/domain\/|dns-query/.test(c.url)));
});

test('K-UZANTI: .data ve .search → KAYDA_KAPALI', async () => {
  const [a, b] = await sor(['zono.data', 'foo.search']);
  assert.equal(a.durum, 'KAYDA_KAPALI');
  assert.equal(b.durum, 'KAYDA_KAPALI');
});

test('(koruma) K-UZANTI ters tanık: açık uzantılar kapalı ya da yok sayılmaz', async () => {
  for (const r of await sor(['zono.com', 'zonoyokxyz.com.tr', 'zono.kim'])) {
    assert.ok(!['KAYDA_KAPALI', 'UZANTI_YOK'].includes(r.durum), `${r.alan} → ${r.durum}`);
  }
});

test('desteklenmeyen ikinci seviye (co.uk) → BELIRSIZ', async () => {
  assert.equal((await tek('zono.co.uk')).durum, 'BELIRSIZ');
});

test('Türkçe karakterli ad TRABİS\'e punycode olarak gider', async () => {
  const ag = standartAg();
  await tek('zonoçarşı.com.tr', ag);
  const q = ag.cagrilar.find((c) => c.tur === 'whois' && c.sunucu === 'whois.trabis.gov.tr' && c.sorgu !== 'google.com.tr');
  assert.match(q.sorgu, /^xn--/);
});

test('K-KONTROL: her şeye "No match" diyen sunucu → BOS değil BELIRSIZ', async () => {
  const ag = standartAg({ whois: { 'whois.trabis.gov.tr|google.com.tr': fikstur('trabis-bos.txt') } });
  assert.equal((await tek('zonoyokxyz.com.tr', ag)).durum, 'BELIRSIZ');
});

test('K-KONTROL: RDAP sunucusu kontrol adına da 404 diyorsa → BELIRSIZ', async () => {
  const ag = standartAg({ http: { '/domain/google.': { status: 404, govde: '' } } });
  assert.equal((await tek('zonoyokxyz.com', ag)).durum, 'BELIRSIZ');
});

// ---------- K-BELIRSIZ ----------
const belirsiz = async (ad, ek) => {
  const r = await tek(ad, standartAg(ek));
  assert.equal(r.durum, 'BELIRSIZ', `${ad}: ${r.durum} (${r.neden})`);
  assert.ok(r.neden, 'BELIRSIZ nedeni yazılmalı');
  return r;
};

test('K-BELIRSIZ: WHOIS bağlantı hatası', () => belirsiz('zonoyokxyz.com.tr', { whois: { 'whois.trabis.gov.tr|*': new Error('ECONNRESET') } }));
test('K-BELIRSIZ: WHOIS boş metin', () => belirsiz('zonoyokxyz.com.tr', { whois: { 'whois.trabis.gov.tr|*': '' } }));
test('K-BELIRSIZ: RDAP 500', () => belirsiz('zonoyokxyz.com', { http: { 'domain/zonoyokxyz.com': { status: 500, govde: '' } } }));
test('K-BELIRSIZ: RDAP 429 + Retry-After 3600 → beklemeden', async () => {
  const ag = standartAg({ http: { 'domain/zonoyokxyz.com': { status: 429, headers: { 'retry-after': '3600' }, govde: '' } } });
  const r = await tek('zonoyokxyz.com', ag);
  assert.equal(r.durum, 'BELIRSIZ');
  assert.ok(!ag.beklemeler.some((ms) => ms > 10_000), `uzun bekleme yapılmamalı: ${ag.beklemeler}`);
});
test('K-BELIRSIZ: DoH hatası + RDAP 404 → BOS değil', () => belirsiz('zonoyokxyz.com', { http: { 'dns-query': new Error('ETIMEDOUT') } }));
test('K-BELIRSIZ: DoH SERVFAIL (Status 2) → BOS değil', () => belirsiz('zonoyokxyz.com', { http: { 'dns-query': { govde: { Status: 2 } } } }));
test('K-BELIRSIZ: IANA uzantı listesi alınamazsa', () => belirsiz('zonoyokxyz.com', { http: { 'data.iana.org/TLD/': new Error('ENOTFOUND') } }));

test('K-BELIRSIZ: bozuk önbellek + indirme hatası → çökmez, BOS demez', async () => {
  const k = geciciKlasor();
  try {
    mkdirSync(k.yol, { recursive: true });
    writeFileSync(join(k.yol, 'iana-tlds.txt'), '');
    writeFileSync(join(k.yol, 'rdap-dns.json'), '{bozuk');
    const ag = standartAg({ http: { 'data.iana.org': new Error('ENOTFOUND') } });
    const [r] = await sorgulaHepsi(['zonoyokxyz.com'], { ag, veriKlasoru: k.yol });
    assert.equal(r.durum, 'BELIRSIZ');
  } finally {
    k.sil();
  }
});

test('429 + kısa Retry-After → bir kez bekleyip yeniden dener', async () => {
  let n = 0;
  const ag = standartAg({ http: { 'domain/zonoyokxyz.com': () => (n++ === 0 ? { status: 429, headers: { 'retry-after': '2' }, govde: '' } : { status: 404, govde: '' }) } });
  const r = await tek('zonoyokxyz.com', ag);
  assert.equal(r.durum, 'BOS');
  assert.ok(ag.beklemeler.includes(2000));
});

test('K-GIRDI: bozuk girdi ağa hiç çıkmaz', async () => {
  const ag = sahteAg();
  const r = await sor(['zono.com\r\nfoo.com', '-h evil.com', `${'a'.repeat(64)}.com`], ag);
  assert.deepEqual(r.map((x) => x.durum), ['GECERSIZ_YAZIM', 'GECERSIZ_YAZIM', 'GECERSIZ_YAZIM']);
  assert.equal(ag.cagrilar.length, 0);
});

test('dolu ad park sunucusundaysa "satılık olabilir" notu düşülür', async () => {
  const park = { ...jsonFikstur('doh-ns-var.json').govde, Answer: [{ name: 'zonopark.com', type: 2, TTL: 1, data: 'ns1.sedoparking.com.' }] };
  const r = await tek('zonopark.com', standartAg({ http: { 'dns-query?name=zonopark.com&': { govde: park } } }));
  assert.equal(r.durum, 'DOLU');
  assert.match(r.not, /satılık olabilir/);
});

test('(koruma) rdap.org hiçbir zaman sorulmaz (RDAP\'ı olmayan uzantı WHOIS\'e gider)', async () => {
  const ag = standartAg();
  await sor(['zonoyokxyz.com.tr', 'zonoyokxyz.com', 'zono.kim'], ag);
  assert.ok(!ag.cagrilar.some((c) => c.url?.includes('rdap.org')));
});
