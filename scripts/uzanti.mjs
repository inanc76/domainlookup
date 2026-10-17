// Uzantı verisi: IANA uzantı listesi · RDAP önyükleme (bootstrap) · kayda kapalı liste · WHOIS sunucusu.
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const GUN = 24 * 3600 * 1000;
const KAPALI_LISTE = new URL('../liste/kapali-uzantilar.json', import.meta.url);

function oku(dosya) {
  try { return readFileSync(dosya, 'utf8'); } catch { return null; }
}

/**
 * Önbellekli indirme: taze önbellek → indir (doğrulanırsa atomik yaz) → eski önbellek → null.
 * Doğrulanmayan indirme eski önbelleği EZMEZ.
 */
async function onbellekli({ ag, klasor, dosyaAdi, url, coz, simdi }) {
  const dosya = join(klasor, dosyaAdi);
  const eski = oku(dosya);
  const eskiDeger = eski != null ? coz(eski) : null;
  const yas = eski != null ? simdi - statSync(dosya).mtimeMs : Infinity;
  if (eskiDeger && yas < GUN) return { deger: eskiDeger };
  try {
    const c = await ag.http(url, { headers: { accept: 'application/json, text/plain' } });
    const deger = c.status === 200 ? coz(c.text) : null;
    if (deger) {
      mkdirSync(klasor, { recursive: true });
      writeFileSync(`${dosya}.tmp`, c.text);
      renameSync(`${dosya}.tmp`, dosya);
      return { deger };
    }
  } catch { /* aşağıda eski önbelleğe düşülür */ }
  if (eskiDeger) return { deger: eskiDeger, not: `önbellek ${Math.floor(yas / GUN)} gün eski` };
  return { deger: null };
}

function tldCoz(metin) {
  const satirlar = metin.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return satirlar.length >= 1000 ? new Set(satirlar.map((l) => l.toLowerCase())) : null;
}

function bootstrapCoz(metin) {
  try {
    const j = JSON.parse(metin);
    if (!Array.isArray(j.services) || j.services.length < 100) return null;
    const m = new Map();
    for (const [tldler, adresler] of j.services) {
      const https = adresler.find((a) => a.startsWith('https://'));
      if (https) for (const t of tldler) m.set(t.toLowerCase(), https);
    }
    return m;
  } catch {
    return null;
  }
}

function kapaliOku() {
  try {
    const j = JSON.parse(readFileSync(KAPALI_LISTE, 'utf8'));
    const m = new Map();
    for (const t of j.spec13 ?? []) m.set(t, 'marka uzantısı — yalnız sahibi kullanır');
    for (const e of j.elle ?? []) m.set(e.uzanti, e.not);
    return m.size ? m : null;
  } catch {
    return null;
  }
}

export async function uzantiVerisiAl({ ag, veriKlasoru, simdi = Date.now() }) {
  const [tld, rdap] = await Promise.all([
    onbellekli({ ag, klasor: veriKlasoru, dosyaAdi: 'iana-tlds.txt', url: 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt', coz: tldCoz, simdi }),
    onbellekli({ ag, klasor: veriKlasoru, dosyaAdi: 'rdap-dns.json', url: 'https://data.iana.org/rdap/dns.json', coz: bootstrapCoz, simdi }),
  ]);
  const whoisSunuculari = new Map();
  return {
    tldler: tld.deger,
    rdap: rdap.deger,
    kapali: kapaliOku(),
    notlar: [tld.not, rdap.not].filter(Boolean),
    /** IANA'nın verdiği WHOIS sunucusu; yoksa null. Hata fırlatabilir. */
    whoisSunucusu(t) {
      if (!whoisSunuculari.has(t)) {
        whoisSunuculari.set(t, ag.whois('whois.iana.org', t).then((m) => m.match(/^whois:\s*(\S+)/im)?.[1]?.toLowerCase() ?? null));
      }
      return whoisSunuculari.get(t);
    },
  };
}
