// K-BIRIM (WHOIS/RDAP ayrıştırma) · K-TEMIZ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whoisKarar, whoisCoz, rdapCoz, temizle } from '../scripts/kayit.mjs';
import { fikstur, jsonFikstur } from './yardimci.mjs';

test('TRABİS cevapları: boş · dolu · geçersiz', () => {
  assert.equal(whoisKarar(fikstur('trabis-bos.txt')), 'BOS');
  assert.equal(whoisKarar(fikstur('trabis-dolu.txt')), 'DOLU');
  assert.equal(whoisKarar(fikstur('trabis-gecersiz.txt')), 'GECERSIZ');
});

test('önce dolu ifadesine bakılır: kayıtta "No match" geçse de DOLU', () => {
  // iki canlı fikstürün birleşimi: dolu kayıt + altında başka sorgunun "No match" satırı
  const karisik = `${fikstur('trabis-dolu.txt')}\n${fikstur('trabis-bos.txt')}`;
  assert.equal(whoisKarar(karisik), 'DOLU');
});

test('tanınmayan ya da boş metin karar vermez', () => {
  assert.equal(whoisKarar(''), null);
  assert.equal(whoisKarar('% Rate limit exceeded, try later'), null);
});

test('TRABİS kaydı ayrıştırılır: kayıt firması, ad sunucuları, durum', () => {
  const r = whoisCoz(fikstur('trabis-dolu.txt'));
  assert.match(r.kayitFirmasi, /ODTÜ GELİŞTİRME VAKFI/);
  assert.deepEqual(r.adSunuculari, ['may.ns.cloudflare.com', 'luke.ns.cloudflare.com']);
  assert.deepEqual(r.durum, ['Active']);
  assert.equal(r.sahip, 'Ornek Sahip A.S.');
});

test('RDAP kaydı ayrıştırılır: tarih, kayıt firması, ad sunucuları, durum', () => {
  const r = rdapCoz(jsonFikstur('verisign-dolu.json').govde);
  assert.equal(r.kayit, '1995-12-08');
  assert.equal(r.bitis, '2027-12-07');
  assert.equal(r.kayitFirmasi, 'Network Solutions, LLC');
  assert.deepEqual(r.adSunuculari, ['ns21.worldnic.com', 'ns22.worldnic.com']);
  assert.deepEqual(r.durum, ['client transfer prohibited']);
});

test('dış kaynaktan gelen alan kontrol karakterinden arınır ve 200 karakterle kesilir', () => {
  assert.equal(temizle('Ornek\u001b[31m Sahip\u0007\u007f'), 'Ornek[31m Sahip');
  assert.equal(temizle('x'.repeat(500)).length, 200);
  assert.equal(temizle(null), null);
});

test('RDAP sahip adı boşluksa açık ad sayılmaz, gizli sayılır', () => {
  // canlıda görüldü (2026-10-17): Network Solutions zono.com kaydında registrant fn = " "
  const j = { entities: [{ roles: ['registrant'], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', ' ']]] }] };
  const r = rdapCoz(j);
  assert.equal(r.sahip, null);
  assert.equal(r.sahipGizli, true);
});
