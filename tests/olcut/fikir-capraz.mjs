#!/usr/bin/env node
// K-FIKIR — modelin "boşta" diye önerdiği her adı betiğe yeniden sorar.
//   node tests/olcut/fikir-capraz.mjs <claude çıktısı.txt>
// Çıkış: 0 hepsi BOS · 1 en az biri BOS değil (model uydurdu) · 2 ÖLÇÜLEMEDİ (boşta ad yok ya da yeniden sorgu belirsiz)
import { readFileSync } from 'node:fs';
import { calistir } from '../../scripts/domainlookup.mjs';

const yol = process.argv[2];
if (!yol) {
  console.log('Kullanım: node tests/olcut/fikir-capraz.mjs <dosya>');
  process.exit(2);
}
const metin = readFileSync(yol, 'utf8');
const DOSYA_UZANTISI = new Set(['mjs', 'js', 'md', 'json', 'txt', 'sh', 'ts']);
// Model biçimi serbest (liste, tablo, kalın başlık). Bu yüzden ad "önerildi" sayılır, şu iki durum dışında:
// satırın kendisi ya da içinde bulunduğu bölümün başlığı dolu / ölçülemedi / önerilmiyor diyorsa.
// Yanılma yönü bilinçli: fazladan ayıklanan ad ölçütü KIRMIZIYA iter, yeşile değil.
const OLUMSUZ = /ölçülemedi|dolu|alınamaz|önerilmiyor|kayda kapalı|uzantı yok/i;
const adlar = new Set();
let olumsuzBolum = false;
for (const satir of metin.split('\n')) {
  if (/^\s*(#{1,6}\s|\*\*)/.test(satir)) olumsuzBolum = OLUMSUZ.test(satir);
  if (olumsuzBolum || OLUMSUZ.test(satir)) continue;
  for (const m of satir.toLowerCase().matchAll(/(?<![\w.@/-])((?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,})(?![\w-])/gu)) {
    if (!DOSYA_UZANTISI.has(m[1].split('.').at(-1))) adlar.add(m[1]);
  }
}
if (!adlar.size) {
  console.log('ÖLÇÜLEMEDİ — çıktıda "boşta" diye önerilen ad bulunamadı');
  process.exit(2);
}
if (adlar.size > 60) {
  console.log(`ÖLÇÜLEMEDİ — ${adlar.size} ad çıkarıldı, sınır 60`);
  process.exit(2);
}
const { json } = await calistir([...adlar, '--fikir', '--premiumsuz', '--json']);
const yanlis = json.sonuclar.filter((s) => !['BOS', 'BELIRSIZ'].includes(s.durum));
const belirsiz = json.sonuclar.filter((s) => s.durum === 'BELIRSIZ');
console.log(`Önerilen boşta ad: ${adlar.size} · betik BOS: ${json.sonuclar.length - yanlis.length - belirsiz.length} · uyuşmayan: ${yanlis.length} · ölçülemedi: ${belirsiz.length}`);
for (const s of yanlis) console.log(`  ❌ ${s.alan} → betik: ${s.durum}`);
for (const s of belirsiz) console.log(`  ⚠️ ${s.alan} → ölçülemedi (${s.neden})`);
process.exit(yanlis.length ? 1 : belirsiz.length ? 2 : 0);
