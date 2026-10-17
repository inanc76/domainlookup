#!/usr/bin/env node
// Fikstürleri CANLI sunuculardan alır — elle fikstür yazılmaz.
// Kullanım: node tests/fikstur/yakala.mjs
// Kişisel alanlar (sahip adı, adres, telefon, e-posta) yazılmadan önce sentetik değerle değiştirilir.
import { connect } from 'node:net';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KLASOR = dirname(fileURLToPath(import.meta.url));
const TARIH = new Date().toISOString().slice(0, 10);

function whois(sunucu, sorgu) {
  return new Promise((coz, red) => {
    let veri = '';
    const s = connect(43, sunucu, () => s.write(`${sorgu}\r\n`));
    s.setTimeout(15_000, () => s.destroy(new Error('zaman aşımı')));
    s.on('data', (p) => (veri += p));
    s.on('end', () => coz(veri));
    s.on('error', red);
  });
}

async function http(adres, govde) {
  const accept = adres.includes('dns-query') ? 'application/dns-json' : 'application/rdap+json, application/json';
  const c = await fetch(adres, govde
    ? { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify(govde) }
    : { headers: { accept } });
  return { status: c.status, metin: await c.text() };
}

// TRABİS sahip bloğu: "** Registrant:" altındaki satırlar
function anonimTrabis(m) {
  return m.replace(/(\*\* Registrant:\r?\n)([\s\S]*?)(\r?\n\r?\n)/, (_, b, govde, son) =>
    b + govde.split(/\r?\n/).map((l, i) => (i === 0 ? 'Ornek Sahip A.S.' : /Hidden/i.test(l) ? l : '***')).join('\n') + son)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g, 'ornek@ornek.invalid')
    .replace(/\+?90[- ]?\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}/g, '+00 000 000 00 00');
}

// Her fikstüre: e-posta, telefon ve kişi adı satırları maskelenir (depo herkese açık olabilir).
const maskele = (m) => m
  .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g, 'ornek@ornek.invalid')
  .replace(/tel:\+?[0-9.]+/g, 'tel:+0.0000000000')
  .replace(/\+\d{1,3}[ .-]?\d[\d .-]{6,}\d/g, '+00 000 000 00 00')
  .replace(/^(\s*(?:name|phone|fax-no|fax):\s+).+$/gim, '$1***');

const yaz = (ad, kaynak, icerik) => {
  writeFileSync(join(KLASOR, ad), ad.endsWith('.txt') && ad.startsWith('iana-tlds') ? icerik : maskele(icerik));
  console.log(`✓ ${ad}  (${kaynak})`);
};
const bas = (komut) => `# yakalandı ${TARIH} · ${komut}\n`;

const rastgele = `zonoyok${Date.now().toString(36)}`;

const isler = [
  async () => yaz('trabis-bos.txt', 'TRABİS boş', bas(`whois -h whois.trabis.gov.tr ${rastgele}.com.tr`) + (await whois('whois.trabis.gov.tr', `${rastgele}.com.tr`))),
  async () => yaz('trabis-dolu.txt', 'TRABİS dolu (anonim)', bas('whois -h whois.trabis.gov.tr mediaclick.com.tr — sahip anonim') + anonimTrabis(await whois('whois.trabis.gov.tr', 'mediaclick.com.tr'))),
  async () => yaz('trabis-gecersiz.txt', 'TRABİS ikinci seviye yok', bas('whois -h whois.trabis.gov.tr zono.xyz.tr') + (await whois('whois.trabis.gov.tr', 'zono.xyz.tr'))),
  async () => yaz('iana-tr.txt', 'IANA refer .tr', bas('whois -h whois.iana.org tr') + (await whois('whois.iana.org', 'tr'))),
  async () => yaz('iana-zzzz.txt', 'IANA olmayan uzantı', bas('whois -h whois.iana.org zzzz') + (await whois('whois.iana.org', 'zzzz'))),
  async () => {
    const r = await http('https://rdap.verisign.com/com/v1/domain/zono.com');
    yaz('verisign-dolu.json', `Verisign ${r.status}`, JSON.stringify({ _yakalandi: `${TARIH} GET https://rdap.verisign.com/com/v1/domain/zono.com`, status: r.status, govde: JSON.parse(r.metin) }, null, 1));
  },
  async () => {
    const r = await http(`https://rdap.verisign.com/com/v1/domain/${rastgele}.com`);
    yaz('verisign-bos.json', `Verisign ${r.status}`, JSON.stringify({ _yakalandi: `${TARIH} GET https://rdap.verisign.com/com/v1/domain/${rastgele}.com`, status: r.status, govde: r.metin }, null, 1));
  },
  async () => {
    const r = await http('https://cloudflare-dns.com/dns-query?name=zono.com&type=NS');
    yaz('doh-ns-var.json', `DoH ${r.status}`, JSON.stringify({ _yakalandi: `${TARIH} DoH zono.com NS`, status: r.status, govde: JSON.parse(r.metin) }, null, 1));
  },
  async () => {
    const r = await http(`https://cloudflare-dns.com/dns-query?name=${rastgele}.com&type=NS`);
    yaz('doh-nxdomain.json', `DoH ${r.status}`, JSON.stringify({ _yakalandi: `${TARIH} DoH ${rastgele}.com NS`, status: r.status, govde: JSON.parse(r.metin) }, null, 1));
  },
  async () => {
    const r = await http('https://data.iana.org/TLD/tlds-alpha-by-domain.txt');
    yaz('iana-tlds.txt', `IANA TLD ${r.status}`, r.metin);
  },
  async () => {
    const r = await http('https://data.iana.org/rdap/dns.json');
    yaz('iana-rdap-dns.json', `IANA RDAP ${r.status}`, r.metin);
  },
  async () => {
    const r = await http('https://api.godaddy.com/v1/domains/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'domains_check_availability', arguments: { domains: 'zonokim.com.tr' } } });
    yaz('godaddy-tr.txt', `GoDaddy ${r.status}`, bas('GoDaddy MCP domains_check_availability zonokim.com.tr') + r.metin);
  },
  ...['love.dev', 'zonokim.com'].map((ad) => async () => {
    const r = await http('https://api.godaddy.com/v1/domains/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'domains_check_availability', arguments: { domains: ad } } });
    yaz(`godaddy-tek-${ad.replace(/\./g, '-')}.txt`, `GoDaddy ${r.status}`, bas(`GoDaddy MCP domains_check_availability ${ad}`) + r.metin);
  }),
];

for (const is of isler) {
  try { await is(); } catch (e) { console.log(`✗ ${e.message}`); process.exitCode = 1; }
}
console.log(`rastgele ad: ${rastgele}`);
