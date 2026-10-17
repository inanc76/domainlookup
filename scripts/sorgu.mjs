// Durum zinciri: bir alan adı boş mu, dolu mu, kayda kapalı mı — emin değilse BELIRSIZ (asla BOS değil).
import { normalizeEt } from './girdi.mjs';
import { whoisKarar, rdapCoz } from './kayit.mjs';
import { uzantiVerisiAl } from './uzanti.mjs';

const DOH = 'https://cloudflare-dns.com/dns-query';
const TRABIS = 'whois.trabis.gov.tr';
const ESZAMANLI = 3;
const TRABIS_ARA_MS = 1000;
const TRABIS_TAVAN = 50;
const BUTCE_MS = 90_000;
const PARK = /sedoparking|parkingcrew|bodis|afternic|dan\.com|above\.com|parklogic|uniregistrymarket|hugedomains|domainmarket|undeveloped|namebrightdns/i;
const SILINMEK_UZERE = /pending ?delete|redemption ?period/i;

/** Sunucunun doğru cevap verdiğini sınamak için bilinen dolu ad. */
function kontrolAdi(uzanti) {
  const son = uzanti.split('.').at(-1);
  if (son === 'tr') return 'google.com.tr';
  if (['com', 'net', 'org'].includes(uzanti)) return `google.${uzanti}`;
  return `nic.${uzanti}`;
}

const hataNedeni = (e) => e?.cause?.code ?? e?.code ?? (e?.name === 'TimeoutError' ? 'zaman aşımı' : e?.message ?? String(e));

function retryAfterMs(deger) {
  if (!deger) return null;
  if (/^\d+$/.test(deger.trim())) return Number(deger) * 1000;
  const t = Date.parse(deger);
  return Number.isNaN(t) ? null : Math.max(0, t - Date.now());
}

async function nsBak(alan, o) {
  try {
    const c = await o.ag.http(`${DOH}?name=${alan}&type=NS`, { headers: { accept: 'application/dns-json' } });
    if (c.status !== 200) return { durum: 'HATA', neden: `DNS HTTP ${c.status}` };
    const j = JSON.parse(c.text);
    if (j.Status === 3) return { durum: 'YOK' };
    if (j.Status !== 0) return { durum: 'HATA', neden: `DNS durum kodu ${j.Status}` };
    const ns = (j.Answer ?? []).filter((a) => a.type === 2).map((a) => String(a.data).toLowerCase().replace(/\.$/, ''));
    return ns.length ? { durum: 'VAR', ns } : { durum: 'YOK' };
  } catch (e) {
    return { durum: 'HATA', neden: `DNS ${hataNedeni(e)}` };
  }
}

/** @returns {{karar:'DOLU', govde}|{karar:'BOS'}|{karar:null, neden}} */
async function rdapSor(taban, alan, o, yonlendirme = 0) {
  const url = yonlendirme ? taban : `${taban.replace(/\/?$/, '/')}domain/${alan}`;
  for (let deneme = 0; ; deneme++) {
    let c;
    try {
      c = await o.ag.http(url, { headers: { accept: 'application/rdap+json' } });
    } catch (e) {
      return { karar: null, neden: `RDAP ${hataNedeni(e)}` };
    }
    if (c.status === 200) {
      try {
        const j = JSON.parse(c.text);
        return j.objectClassName === 'domain' ? { karar: 'DOLU', govde: j } : { karar: null, neden: 'RDAP cevabı alan adı kaydı değil' };
      } catch {
        return { karar: null, neden: 'RDAP cevabı okunamadı' };
      }
    }
    if (c.status === 404) return { karar: 'BOS' };
    if (c.status >= 300 && c.status < 400) {
      const yer = c.headers.get('location');
      if (yonlendirme || !yer?.startsWith('https://')) return { karar: null, neden: `RDAP yönlendirmesi izlenmedi (${c.status})` };
      return rdapSor(yer, alan, o, 1);
    }
    if (c.status === 429) {
      const ms = retryAfterMs(c.headers.get('retry-after')) ?? 3000;
      if (deneme === 0 && ms <= 10_000) { await o.ag.bekle(ms); continue; }
      return { karar: null, neden: 'hız sınırı (429)' };
    }
    return { karar: null, neden: `RDAP HTTP ${c.status}` };
  }
}

async function whoisSor(sunucu, alan, o) {
  if (sunucu !== TRABIS) return o.ag.whois(sunucu, alan);
  // TRABİS'e sıralı, aralıklı ve oturum başına sınırlı gidilir
  const sira = o.trabisSira.then(async () => {
    if (++o.trabisSayac > TRABIS_TAVAN) throw new Error(`oturumda ${TRABIS_TAVAN} TRABİS sorgusu sınırı`);
    if (o.trabisSayac > 1) await o.ag.bekle(TRABIS_ARA_MS);
    return o.ag.whois(sunucu, alan);
  });
  o.trabisSira = sira.catch(() => {});
  return sira;
}

/** Sunucu, bilinen dolu adı dolu görüyor mu? Sunucu başına bir kez sorulur. */
function kontrol(anahtar, sor, o) {
  if (!o.kontroller.has(anahtar)) o.kontroller.set(anahtar, sor().then((v) => v === 'DOLU', () => false));
  return o.kontroller.get(anahtar);
}

async function tekSorgu(ham, o) {
  const g = normalizeEt(ham);
  if (g.hata) return { alan: String(ham), durum: 'GECERSIZ_YAZIM', neden: g.hata };
  const { alan, uzanti } = g;
  const sonuc = (durum, ek = {}) => ({ alan, uzanti, durum, ...ek });
  const belirsiz = (neden, ek) => sonuc('BELIRSIZ', { neden, ...ek });
  if (g.desteklenmeyen) return belirsiz(`desteklenmeyen ikinci seviye .${uzanti} (ilk sürümde yalnız .tr)`);

  const v = await o.veri();
  const tld = uzanti.split('.').at(-1);
  if (!v.tldler) return belirsiz('IANA uzantı listesi alınamadı');
  if (!v.tldler.has(tld)) return sonuc('UZANTI_YOK', { kaynak: 'liste' });
  if (!v.kapali) return belirsiz('kayda kapalı uzantı listesi okunamadı');
  const kapali = v.kapali.get(uzanti) ?? v.kapali.get(tld);
  if (kapali) return sonuc('KAYDA_KAPALI', { kaynak: 'liste', not: kapali });
  if (Date.now() > o.bitis) return belirsiz(`süre bütçesi (${BUTCE_MS / 1000} sn) doldu`);

  const ns = await nsBak(alan, o);
  if (ns.durum === 'VAR') {
    return sonuc('DOLU', { kaynak: 'dns', ...(ns.ns.some((n) => PARK.test(n)) ? { not: 'satılık olabilir (park sunucusunda)' } : {}) });
  }

  const taban = v.rdap?.get(uzanti) ?? v.rdap?.get(tld);
  if (taban) {
    const r = await rdapSor(taban, alan, o);
    if (r.karar === 'DOLU') {
      const k = rdapCoz(r.govde);
      return sonuc('DOLU', { kaynak: 'rdap', sunucu: new URL(taban).host, ...(k.durum.some((d) => SILINMEK_UZERE.test(d)) ? { not: 'silinmek üzere' } : {}) });
    }
    if (r.karar === null) return belirsiz(r.neden, { kaynak: 'rdap', sunucu: new URL(taban).host });
    if (ns.durum === 'HATA') return belirsiz(ns.neden, { kaynak: 'rdap' });
    const ok = await kontrol(taban, async () => (await rdapSor(taban, kontrolAdi(uzanti), o)).karar, o);
    return ok
      ? sonuc('BOS', { kaynak: 'rdap', sunucu: new URL(taban).host })
      : belirsiz(`RDAP sunucusu doğrulanamadı (${kontrolAdi(uzanti)} de boş göründü)`, { kaynak: 'rdap' });
  }
  if (!v.rdap && tld !== 'tr') return belirsiz('RDAP önyükleme listesi alınamadı');

  let sunucu;
  try {
    sunucu = tld === 'tr' ? TRABIS : await v.whoisSunucusu(tld);
  } catch (e) {
    return belirsiz(`WHOIS sunucusu bulunamadı (${hataNedeni(e)})`);
  }
  if (!sunucu) return belirsiz('uzantının ne RDAP ne WHOIS sunucusu var');
  let metin;
  try {
    metin = await whoisSor(sunucu, alan, o);
  } catch (e) {
    return belirsiz(`WHOIS ${hataNedeni(e)}`, { kaynak: 'whois', sunucu });
  }
  const karar = whoisKarar(metin);
  if (karar === 'DOLU') return sonuc('DOLU', { kaynak: 'whois', sunucu, ...(SILINMEK_UZERE.test(metin) ? { not: 'silinmek üzere' } : {}) });
  if (karar === 'AYRILMIS') return sonuc('KAYDA_KAPALI', { kaynak: 'whois', sunucu, not: 'kayıt kurumu bu adı ayırmış' });
  if (karar === 'GECERSIZ') return sonuc('UZANTI_YOK', { kaynak: 'whois', sunucu, not: `kayıt kurumu .${uzanti} uzantısını tanımıyor` });
  if (karar !== 'BOS') return belirsiz(metin.trim() ? 'WHOIS cevabı çözülemedi' : 'WHOIS boş cevap verdi', { kaynak: 'whois', sunucu });
  if (ns.durum === 'HATA') return belirsiz(ns.neden, { kaynak: 'whois', sunucu });
  const ok = await kontrol(sunucu, async () => whoisKarar(await whoisSor(sunucu, kontrolAdi(uzanti), o)), o);
  return ok
    ? sonuc('BOS', { kaynak: 'whois', sunucu })
    : belirsiz(`WHOIS sunucusu doğrulanamadı (${kontrolAdi(uzanti)} de boş göründü)`, { kaynak: 'whois', sunucu });
}

/** Adları sırayla değil, en çok 3 eşzamanlı sorar; sonuçlar girdi sırasıyla döner. */
export async function sorgulaHepsi(adlar, { ag, veriKlasoru, simdi = Date.now() }) {
  let veriSozu = null;
  const o = {
    ag,
    veri: () => (veriSozu ??= uzantiVerisiAl({ ag, veriKlasoru, simdi })),
    kontroller: new Map(),
    trabisSira: Promise.resolve(),
    trabisSayac: 0,
    bitis: Date.now() + BUTCE_MS,
  };
  const sonuclar = new Array(adlar.length);
  let sira = 0;
  const isci = async () => {
    while (sira < adlar.length) {
      const i = sira++;
      try {
        sonuclar[i] = await tekSorgu(adlar[i], o);
      } catch (e) {
        sonuclar[i] = { alan: String(adlar[i]), durum: 'BELIRSIZ', neden: `beklenmeyen hata: ${hataNedeni(e)}` };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, adlar.length) }, isci));
  return sonuclar;
}

export { kontrolAdi, rdapSor, whoisSor, TRABIS };
