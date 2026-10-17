#!/usr/bin/env node
// liste/kapali-uzantilar.json'ı yeniler: ICANN gTLD listesinden marka uzantıları (Specification 13) + elle eklenenler korunur.
// Kullanım: node liste/guncelle.mjs        (farkı gösterir, dosyayı yazar)
import { readFileSync, writeFileSync } from 'node:fs';

const DOSYA = new URL('./kapali-uzantilar.json', import.meta.url);
const ICANN = 'https://www.icann.org/resources/registries/gtlds/v2/gtlds.json';

const eski = (() => { try { return JSON.parse(readFileSync(DOSYA, 'utf8')); } catch { return { spec13: [], elle: [] }; } })();
const c = await fetch(ICANN, { signal: AbortSignal.timeout(30_000) });
if (!c.ok) { console.error(`ICANN HTTP ${c.status}`); process.exit(2); }
const { gTLDs } = await c.json();
const spec13 = gTLDs.filter((g) => g.specification13 && !g.removalDate && !g.contractTerminated).map((g) => g.gTLD.toLowerCase()).sort();
if (spec13.length < 100) { console.error(`beklenmedik az sayı: ${spec13.length}`); process.exit(2); }

const eklenen = spec13.filter((t) => !eski.spec13.includes(t));
const cikan = eski.spec13.filter((t) => !spec13.includes(t));
writeFileSync(DOSYA, `${JSON.stringify({
  _kaynak: `${ICANN} — specification13=true, removalDate=null, contractTerminated=false`,
  _tarih: new Date().toISOString().slice(0, 10),
  _komut: 'node liste/guncelle.mjs',
  spec13,
  elle: eski.elle ?? [],
}, null, 1)}\n`);
console.log(`spec13: ${spec13.length} (eklenen ${eklenen.length}: ${eklenen.join(' ') || '-'} · çıkan ${cikan.length}: ${cikan.join(' ') || '-'}) · elle: ${(eski.elle ?? []).length}`);
