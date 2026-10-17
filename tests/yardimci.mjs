// Test yardımcıları: canlıdan yakalanmış fikstürlerle sahte ağ.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIKSTUR = join(dirname(fileURLToPath(import.meta.url)), 'fikstur');

/** Fikstür metni — baştaki "# yakalandı" satırı atılır. */
export function fikstur(ad) {
  const m = readFileSync(join(FIKSTUR, ad), 'utf8');
  return m.startsWith('# yakalandı') ? m.slice(m.indexOf('\n') + 1) : m;
}
/** {status, govde} biçimli JSON fikstür. */
export const jsonFikstur = (ad) => JSON.parse(readFileSync(join(FIKSTUR, ad), 'utf8'));

export function geciciKlasor() {
  const yol = mkdtempSync(join(tmpdir(), 'domainlookup-test-'));
  return { yol, sil: () => rmSync(yol, { recursive: true, force: true }) };
}

const cevap = (c) => ({
  status: c.status ?? 200,
  headers: new Headers(c.headers ?? {}),
  text: typeof c.govde === 'string' ? c.govde : JSON.stringify(c.govde ?? ''),
});

/**
 * kurallar.http: { 'adres parçası': cevap | (url, secenek) => cevap | Error }  — ilk eşleşen kazanır
 * kurallar.whois: { 'sunucu|sorgu': metin | Error, 'sunucu|*': ... }
 */
export function sahteAg(kurallar = {}) {
  const cagrilar = [];
  const beklemeler = [];
  return {
    cagrilar,
    beklemeler,
    async http(url, secenek = {}) {
      cagrilar.push({ tur: 'http', url, govde: secenek.body });
      for (const [desen, c] of Object.entries(kurallar.http ?? {})) {
        if (!url.includes(desen)) continue;
        const v = typeof c === 'function' ? await c(url, secenek) : c;
        if (v instanceof Error) throw v;
        return cevap(v);
      }
      throw new Error(`sahte ağ: tanımsız adres ${url}`);
    },
    async whois(sunucu, sorgu) {
      cagrilar.push({ tur: 'whois', sunucu, sorgu });
      const v = kurallar.whois?.[`${sunucu}|${sorgu}`] ?? kurallar.whois?.[`${sunucu}|*`];
      if (v === undefined) throw new Error(`sahte ağ: tanımsız whois ${sunucu} ${sorgu}`);
      if (v instanceof Error) throw v;
      return typeof v === 'function' ? v(sorgu) : v;
    },
    async bekle(ms) { beklemeler.push(ms); },
  };
}

const godaddy = (ad) => fikstur(`godaddy-tek-${ad.replace(/\./g, '-')}.txt`);

// `ek` kuralları önce denenir; aynı anahtar varsa ek kazanır.
const birlestir = (ek = {}, varsayilan) => {
  const r = { ...ek };
  for (const [k, v] of Object.entries(varsayilan)) if (!(k in r)) r[k] = v;
  return r;
};

/** Gerçek dünyayı taklit eden varsayılan kurallar; `ek` önce denenir. */
export function standartAg(ek = {}) {
  const rdapDolu = jsonFikstur('verisign-dolu.json');
  return sahteAg({
    http: birlestir(ek.http, {
      'data.iana.org/TLD/': { govde: fikstur('iana-tlds.txt') },
      'data.iana.org/rdap/dns.json': { govde: fikstur('iana-rdap-dns.json') },
      'dns-query?name=zono.com&': { govde: jsonFikstur('doh-ns-var.json').govde },
      'dns-query?name=zono.net&': { govde: jsonFikstur('doh-ns-var.json').govde },
      'dns-query': { govde: jsonFikstur('doh-nxdomain.json').govde },
      'rdap.verisign.com/com/v1/domain/zono.com': { status: 200, govde: rdapDolu.govde },
      'rdap.verisign.com/net/v1/domain/zono.net': { status: 200, govde: rdapDolu.govde },
      '/domain/google.': { status: 200, govde: rdapDolu.govde },
      '/domain/nic.': { status: 200, govde: rdapDolu.govde },
      'rdap.networksolutions.com': new Error('kayıt firması RDAP testte yok'),
      'api.godaddy.com': (url, s) => {
        const ad = JSON.parse(s.body).params.arguments.domains;
        return { govde: godaddy(ad === 'love.dev' ? 'love.dev' : 'zonokim.com').replaceAll(ad === 'love.dev' ? 'love.dev' : 'zonokim.com', ad) };
      },
      '/domain/': { status: 404, govde: '' },
    }),
    whois: birlestir(ek.whois, {
      'whois.iana.org|tr': fikstur('iana-tr.txt'),
      'whois.trabis.gov.tr|google.com.tr': fikstur('trabis-dolu.txt'),
      'whois.trabis.gov.tr|mediaclick.com.tr': fikstur('trabis-dolu.txt'),
      'whois.trabis.gov.tr|zono.xyz.tr': fikstur('trabis-gecersiz.txt'),
      'whois.trabis.gov.tr|*': (sorgu) => fikstur('trabis-bos.txt').replace(/No match found for \S+/, `No match found for ${sorgu}`),
    }),
  });
}
