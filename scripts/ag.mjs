// Gerçek ağ: her istek sınırlı (8 sn, 256 KB). Testler bunun yerine sahte ağ verir.
import { connect } from 'node:net';
import { readFileSync } from 'node:fs';

const SURUM = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
export const UA = `domainlookup/${SURUM} (+https://github.com/inanc76/domainlookup)`;
const SUNUCU_ADI = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;

async function sinirliOku(govde, azami) {
  if (!govde) return '';
  const parcalar = [];
  let boy = 0;
  for await (const p of govde) {
    boy += p.length;
    if (boy > azami) throw new Error(`cevap ${azami / 1024} KB sınırını aştı`);
    parcalar.push(p);
  }
  return Buffer.concat(parcalar).toString('utf8');
}

export function gercekAg({ zamanAsimi = 8_000, azamiBayt = 256 * 1024 } = {}) {
  return {
    async http(url, { method = 'GET', headers = {}, body } = {}) {
      if (!url.startsWith('https://')) throw new Error('yalnız https adresine gidilir');
      const c = await fetch(url, {
        method, body, redirect: 'manual',
        headers: { 'user-agent': UA, ...headers },
        signal: AbortSignal.timeout(zamanAsimi),
      });
      return { status: c.status, headers: c.headers, text: await sinirliOku(c.body, azamiBayt) };
    },
    whois(sunucu, sorgu) {
      if (!SUNUCU_ADI.test(sunucu)) return Promise.reject(new Error(`geçersiz whois sunucusu: ${sunucu}`));
      return new Promise((coz, red) => {
        const parcalar = [];
        let boy = 0;
        const s = connect({ host: sunucu, port: 43 }, () => s.write(`${sorgu}\r\n`));
        s.setTimeout(zamanAsimi, () => s.destroy(new Error('zaman aşımı')));
        s.on('data', (p) => {
          boy += p.length;
          if (boy > azamiBayt) return s.destroy(new Error(`cevap ${azamiBayt / 1024} KB sınırını aştı`));
          parcalar.push(p);
        });
        s.on('end', () => coz(Buffer.concat(parcalar).toString('utf8')));
        s.on('error', red);
      });
    },
    bekle: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}
