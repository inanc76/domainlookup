// WHOIS / RDAP cevaplarını okur: boş mu dolu mu kararı + kayıt alanları.
// kaynak: inanc76/techlookup@de695ed scripts/kimlik.mjs (GIZLI, AYLAR, tarihCoz, sahipAyarla, whoisCoz, vcard, rdapCoz)
// değişen: TRABİS "No match found" burada BOS demektir (techlookup'ta "ölçülemedi"); ad sunucusu + durum eklendi.

const GIZLI = /redact|privacy|private|gizli|hidden|withheld|not disclosed|data protected|statutory masking|non-public/i;
const AYLAR = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

/** Dış kaynaktan gelen metin: kontrol karakterleri atılır, tablo ayıracı değiştirilir, 200 karakterle kesilir. */
export function temizle(s) {
  if (s == null) return null;
  return String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\|/g, '¦').trim().slice(0, 200);
}

function tarihCoz(s) {
  if (!s) return null;
  s = s.trim();
  let m = s.match(/^(\d{4})-([a-z]{3})-(\d{1,2})/i);
  if (m && AYLAR[m[2].toLowerCase()]) return `${m[1]}-${AYLAR[m[2].toLowerCase()]}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{4})[-./](\d{2})[-./](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[-./](\d{2})[-./](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

function sahipAyarla(ham) {
  const s = ham?.trim();
  if (!s) return { sahip: null, sahipGizli: false };
  return GIZLI.test(s) ? { sahip: null, sahipGizli: true } : { sahip: s, sahipGizli: false };
}

// Sıra önemli: önce dolu, sonra ayrılmış, sonra geçersiz, en son boş ifadesi aranır.
// Böylece dolu bir kaydın uyarı metninde geçen "no match" boş sayılmaz.
const DOLU = [/^\s*\*\*\s*Domain Name:\s*\S/im, /^\s*Domain Name:\s*\S/im, /^\s*Registry Domain ID:\s*\S/im, /^\s*Creation Date:\s*\S/im, /^\s*Registrar:\s*\S/im, /^\s*status:\s*(?:active|registered|connect|ok)\b/im];
const AYRILMIS = [/^\s*status:\s*reserved\b/im, /\b(?:domain|name) (?:is )?reserved\b/i, /reserved (?:name|domain)\b/i, /not available for registration/i, /registration (?:is )?(?:restricted|prohibited)/i];
const GECERSIZ = [/^\s*invalid input\b/im, /^\s*invalid (?:domain|query)\b/im];
const BOS = [/no match/i, /\bnot found\b/i, /no data found/i, /no entries found/i, /no object found/i, /object does not exist/i, /is available for registration/i, /^\s*status:\s*(?:free|available)\b/im];

/** @returns {'DOLU'|'AYRILMIS'|'GECERSIZ'|'BOS'|null} — null: karar verilemedi */
export function whoisKarar(metin) {
  if (!metin?.trim()) return null;
  if (DOLU.some((r) => r.test(metin))) return 'DOLU';
  if (AYRILMIS.some((r) => r.test(metin))) return 'AYRILMIS';
  if (GECERSIZ.some((r) => r.test(metin))) return 'GECERSIZ';
  if (BOS.some((r) => r.test(metin))) return 'BOS';
  return null;
}

/** TRABİS (.tr) ve klasik whois metni. */
export function whoisCoz(metin) {
  const satirlar = metin.split(/\r?\n/);
  const r = { sahip: null, sahipGizli: false, kayit: null, bitis: null, kayitFirmasi: null, durum: [], adSunuculari: [] };
  const i = satirlar.findIndex((l) => /^\*\*\s*Registrant:/i.test(l));
  if (i >= 0) Object.assign(r, sahipAyarla(satirlar.slice(i + 1).find((l) => l.trim())));
  const al = (re) => metin.match(re)?.[1]?.trim();
  if (i < 0) {
    const org = al(/^\s*Registrant(?: Organi[sz]ation| Name)?\s*:\s*(.+)$/im);
    if (org) Object.assign(r, sahipAyarla(org));
  }
  r.kayit = tarihCoz(al(/^\s*(?:Created on\.*|Creation Date|created|Registered on|Registration Time|Domain Registration Date)\s*:\s*(.+)$/im));
  r.bitis = tarihCoz(al(/^\s*(?:Expires on\.*|Registry Expiry Date|Expiration Date|Expiry Date|expires|paid-till|Registrar Registration Expiration Date)\s*:\s*(.+)$/im));
  const reg = metin.match(/\*\*\s*Registrar:[\s\S]*?Organization Name\s*:\s*(.+)/i)?.[1] ?? al(/^\s*Registrar\s*:\s*(.+)$/im);
  r.kayitFirmasi = reg?.trim() || null;

  // durum: "Domain Status: Active" (TRABİS) · "Domain Status: clientTransferProhibited https://…" (ICANN biçimi)
  for (const m of metin.matchAll(/^\s*(?:Domain )?Status\s*:\s*(\S+)/gim)) if (!r.durum.includes(m[1])) r.durum.push(m[1]);
  // ad sunucuları: TRABİS "** Domain Servers:" bloğu · "Name Server: x" satırları
  const j = satirlar.findIndex((l) => /^\*\*\s*Domain Servers:/i.test(l));
  if (j >= 0) {
    for (const l of satirlar.slice(j + 1)) {
      if (!l.trim()) break;
      r.adSunuculari.push(l.trim().split(/\s+/)[0].toLowerCase().replace(/\.$/, ''));
    }
  }
  for (const m of metin.matchAll(/^\s*(?:Name Server|nserver)\s*:\s*(\S+)/gim)) {
    const ns = m[1].toLowerCase().replace(/\.$/, '');
    if (!r.adSunuculari.includes(ns)) r.adSunuculari.push(ns);
  }
  return r;
}

function vcard(e, alan) {
  return e?.vcardArray?.[1]?.find((x) => x[0] === alan)?.[3] ?? null;
}

/** RDAP cevabı (kayıt kuruluşu veya kayıt firması). */
export function rdapCoz(j) {
  const olay = (ad) => j.events?.find((e) => e.eventAction === ad)?.eventDate?.slice(0, 10) ?? null;
  const rol = (ad) => (j.entities ?? []).find((e) => e.roles?.includes(ad));
  const kayitci = rol('registrar');
  const sahipVarligi = rol('registrant');
  const adlar = [vcard(sahipVarligi, 'org'), vcard(sahipVarligi, 'fn')].filter(Boolean);
  const acik = adlar.find((a) => !GIZLI.test(a));
  return {
    kayit: olay('registration'),
    bitis: olay('expiration'),
    kayitFirmasi: vcard(kayitci, 'fn') ?? vcard(kayitci, 'org'),
    sahip: acik ?? null,
    sahipGizli: !acik && Boolean(sahipVarligi),
    durum: Array.isArray(j.status) ? [...j.status] : [],
    adSunuculari: (j.nameservers ?? []).map((n) => n.ldhName?.toLowerCase().replace(/\.$/, '')).filter(Boolean),
  };
}
