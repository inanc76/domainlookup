// K-ALTERNATIF · K-JSON · K-CIKIS · K-TAVAN · K-WHOIS · K-TEMIZ · K-PREMIUM (BOS kalır)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calistir } from '../scripts/domainlookup.mjs';
import { standartAg, sahteAg, geciciKlasor, fikstur } from './yardimci.mjs';

async function kos(argv, ag = standartAg()) {
  const k = geciciKlasor();
  try {
    return await calistir(argv, { ag, veriKlasoru: k.yol, simdi: new Date('2026-10-17T11:05:00Z') });
  } finally {
    k.sil();
  }
}

test('K-ALTERNATIF: kapalı uzantı → aynı ad diğer uzantılarda numaralı denenir', async () => {
  const r = await kos(['zono.data']);
  const satirlar = r.metin.split('\n');
  assert.match(satirlar.find((l) => l.startsWith('1. ')), /zono\.data.*⛔ kayda kapalı/);
  assert.match(satirlar.find((l) => l.startsWith('2. ')), /zono\.com.*❌ dolu.*"whois2"/);
  assert.match(satirlar.find((l) => l.startsWith('3. ')), /zono\.net.*❌ dolu.*"whois3"/);
  assert.ok(satirlar.some((l) => /zono\.com\.tr.*✅ boşta · premium ölçülmedi/.test(l)));
});

test('istenen ad boşsa yalnız o satır yazılır', async () => {
  const r = await kos(['zonoyokxyz.com']);
  assert.equal(r.metin.split('\n').filter((l) => /^\d+\. /.test(l)).length, 1);
  assert.equal(r.cikis, 0);
});

test('K-PREMIUM: premium ad boş kalır, 💎 etiketi alır', async () => {
  const ag = standartAg({ http: { 'dns-query?name=love.dev&': { govde: { Status: 3 } } } });
  const r = await kos(['love.dev'], ag);
  assert.match(r.metin, /love\.dev.*💎 boşta ama premium/);
  assert.equal(r.json.sonuclar[0].durum, 'BOS');
  assert.equal(r.json.sonuclar[0].premium, 'premium');
});

test('--premiumsuz GoDaddy\'ye hiç sormaz', async () => {
  const ag = standartAg();
  const r = await kos(['zonoyokxyz.com', '--premiumsuz'], ag);
  assert.equal(ag.cagrilar.filter((c) => c.url?.includes('godaddy')).length, 0);
  assert.match(r.metin, /zonoyokxyz\.com.*✅ boşta/);
});

test('K-JSON: sözleşme', async () => {
  const { json } = await kos(['zono.data', '--json']);
  assert.equal(json.surum, 1);
  assert.equal(json.sorgu, 'zono.data');
  assert.ok(!Number.isNaN(Date.parse(json.olusturma)));
  const DURUM = ['GECERSIZ_YAZIM', 'UZANTI_YOK', 'KAYDA_KAPALI', 'DOLU', 'BOS', 'BELIRSIZ'];
  json.sonuclar.forEach((s, i) => {
    assert.equal(s.no, i + 1);
    assert.equal(typeof s.alan, 'string');
    assert.ok(DURUM.includes(s.durum), s.durum);
    if (s.kaynak) assert.ok(['rdap', 'whois', 'dns', 'liste'].includes(s.kaynak), s.kaynak);
    if (s.durum === 'BELIRSIZ') assert.ok(s.neden);
  });
});

test('K-CIKIS: zaman aşımı → çıkış 2 ve ⚠️ ölçülemedi', async () => {
  const r = await kos(['zonoyokxyz.com.tr'], standartAg({ whois: { 'whois.trabis.gov.tr|*': new Error('zaman aşımı') } }));
  assert.equal(r.cikis, 2);
  assert.match(r.metin, /⚠️ ölçülemedi/);
});

test('K-CIKIS: geçersiz yazım → çıkış 1', async () => {
  assert.equal((await kos(['zo no.com'])).cikis, 1);
});

test('K-TAVAN: 61 ad → çıkış 1, ağa hiç istek yok', async () => {
  const ag = sahteAg();
  const r = await kos([...Array.from({ length: 61 }, (_, i) => `zono${i}.com`), '--fikir'], ag);
  assert.equal(r.cikis, 1);
  assert.equal(ag.cagrilar.length, 0);
});

test('--fikir uzantı genişlemesi yapmaz, boşları ayrı başlıkta verir', async () => {
  const r = await kos(['zono.com', 'zonoyokxyz.com', '--fikir', '--premiumsuz']);
  assert.equal(r.json.sonuclar.length, 2);
  assert.match(r.metin, /Boşta/);
});

test('K-WHOIS: dolu adın kaydı — kayıt firması, tarihler, durum, ad sunucuları', async () => {
  const r = await kos(['whois', 'zono.com']);
  assert.match(r.metin, /Network Solutions, LLC/);
  assert.match(r.metin, /1995-12-08/);
  assert.match(r.metin, /2027-12-07/);
  assert.match(r.metin, /client transfer prohibited/);
  assert.match(r.metin, /ns21\.worldnic\.com/);
});

test('K-WHOIS: .com.tr kaydı TRABİS\'ten gelir', async () => {
  const r = await kos(['whois', 'mediaclick.com.tr']);
  assert.match(r.metin, /ODTÜ GELİŞTİRME VAKFI/);
  assert.match(r.metin, /may\.ns\.cloudflare\.com/);
});

test('K-TEMIZ: WHOIS içindeki kaçış dizileri ekrana gitmez', async () => {
  const zehirli = fikstur('trabis-dolu.txt').replace('Ornek Sahip A.S.', 'Ornek\u001b]8;;http://kotu\u0007 Sahip\u001b[2J');
  const r = await kos(['whois', 'mediaclick.com.tr'], standartAg({ whois: { 'whois.trabis.gov.tr|mediaclick.com.tr': zehirli } }));
  assert.match(r.metin, /Ornek\]8;;http:\/\/kotu Sahip/, 'alan ekrana gelmeli (kaçışsız)');
  assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(r.metin), 'kontrol karakteri kalmamalı');
});

test('kullanım: argümansız → çıkış 1', async () => {
  assert.equal((await kos([])).cikis, 1);
});
