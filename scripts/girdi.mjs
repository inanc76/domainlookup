// Tek giriş kapısı: ağa giden her alan adı buradan geçer.
import { domainToASCII } from 'node:url';

// kaynak: inanc76/techlookup@de695ed scripts/kimlik.mjs (IKINCI_SEVIYE)
const IKINCI_SEVIYE = /^(com|net|org|gov|edu|co|ac|gen|biz|info|bel|k12|av|dr|pol|tsk|web|tv|name|tel|ltd|plc|nhs|sch|gob|mil|or|ne|go)$/;
const ETIKET = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * @returns {{alan:string, etiket:string, uzanti:string, desteklenmeyen?:true} | {hata:string}}
 * `uzanti`: kayıt kurumunun uzantısı — "com", "com.tr", "tr". `.tr` dışındaki ikinci seviyeler (co.uk) ilk sürümde desteklenmez.
 */
export function normalizeEt(ham) {
  if (typeof ham !== 'string' || !ham.trim()) return { hata: 'boş girdi' };
  let s = ham.trim();
  if (/[\u0000- \u007f-\u009f]/.test(s)) return { hata: 'boşluk ya da kontrol karakteri içeriyor' };
  s = s.toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  if (s.startsWith('www.')) s = s.slice(4);
  const ascii = domainToASCII(s);
  if (!ascii) return { hata: 'yazım çözülemedi' };
  if (ascii.length > 253) return { hata: '253 karakterden uzun' };
  const p = ascii.split('.');
  if (p.length < 2) return { hata: 'uzantı yok (ör. zono.com)' };
  const kotu = p.find((e) => !ETIKET.test(e));
  if (kotu !== undefined) return { hata: kotu.length > 63 ? 'bir bölüm 63 karakterden uzun' : `geçersiz bölüm "${kotu}"` };

  const son = p.at(-1);
  if (son === 'tr' && p.length >= 3) return { alan: p.slice(-3).join('.'), etiket: p.at(-3), uzanti: p.slice(-2).join('.') };
  if (p.length >= 3 && son.length === 2 && IKINCI_SEVIYE.test(p.at(-2))) {
    return { alan: p.slice(-3).join('.'), etiket: p.at(-3), uzanti: p.slice(-2).join('.'), desteklenmeyen: true };
  }
  return { alan: p.slice(-2).join('.'), etiket: p.at(-2), uzanti: son };
}
