// Premium tespiti: yalnız BOS adlar, GoDaddy'nin resmî anahtarsız MCP ucuna tek tek sorulur.
// GoDaddy boş/dolu kararı VERMEZ; yalnız "premium mu" bilgisi alınır. Satmadığı uzantılar (.tr ailesi) hiç gönderilmez.
import { readFileSync } from 'node:fs';
import { normalizeEt } from './girdi.mjs';

const UC = 'https://api.godaddy.com/v1/domains/mcp';
const ESZAMANLI = 3;
const SATMAZ = JSON.parse(readFileSync(new URL('../liste/godaddy-satmaz.json', import.meta.url), 'utf8')).uzantilar;
const TUR = { Premium: 'premium', Standard: 'standart', Auction: 'acik-artirma' };

export const godaddySatmaz = (uzanti) => SATMAZ.some((x) => uzanti === x || uzanti.endsWith(`.${x}`));

function cevapCoz(metin) {
  const satir = metin.split(/\r?\n/).find((l) => l.startsWith('data: '));
  return JSON.parse(satir ? satir.slice(6) : metin);
}

async function tekBak(alan, ag) {
  try {
    const c = await ag.http(UC, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'domains_check_availability', arguments: { domains: alan } } }),
    });
    if (c.status !== 200) return null;
    const r = cevapCoz(c.text).result;
    if (!r || r.isError) return null;
    const tam = r.structuredContent?.domains?.find((d) => d.isExactMatch && d.name?.toLowerCase() === alan);
    if (!tam || tam.available !== true) return null;
    return TUR[tam.inventoryType] ?? null;
  } catch {
    return null;
  }
}

/** @returns {Promise<Map<string, 'premium'|'standart'|'acik-artirma'|null>>} null = premium ölçülmedi */
export async function premiumBak(alanlar, { ag }) {
  const m = new Map();
  const sorulacak = [];
  for (const a of alanlar) {
    const g = normalizeEt(a);
    if (g.hata || godaddySatmaz(g.uzanti)) m.set(a, null);
    else sorulacak.push(a);
  }
  let i = 0;
  const isci = async () => {
    while (i < sorulacak.length) {
      const a = sorulacak[i++];
      m.set(a, await tekBak(a, ag));
    }
  };
  await Promise.all(Array.from({ length: Math.min(ESZAMANLI, sorulacak.length) }, isci));
  return m;
}
