#!/usr/bin/env node
// domainlookup — alan adı boşta mı · WHOIS kaydı · fikir listesinin kontrolü.
//   node scripts/domainlookup.mjs <alan…> [--fikir] [--premiumsuz] [--uzantilar=com,net] [--json]
//   node scripts/domainlookup.mjs whois <alan>
// Çıkış kodu: 0 hepsi kesin · 1 kullanım hatası / geçersiz yazım / 60 ad sınırı · 2 en az biri ölçülemedi
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeEt } from './girdi.mjs';
import { sorgulaHepsi, rdapSor, whoisSor, TRABIS } from './sorgu.mjs';
import { premiumBak } from './premium.mjs';
import { uzantiVerisiAl } from './uzanti.mjs';
import { whoisKarar, whoisCoz, rdapCoz } from './kayit.mjs';
import { sorguMetni, fikirMetni, whoisMetni } from './tablo.mjs';
import { gercekAg } from './ag.mjs';

export const VARSAYILAN_UZANTILAR = ['com', 'net', 'org', 'com.tr', 'net.tr', 'io', 'co', 'app', 'ai', 'dev', 'me'];
const TAVAN = 60;
const VARSAYILAN_VERI = fileURLToPath(new URL('../veri/', import.meta.url));

const YARDIM = `domainlookup — alan adı boşta mı, WHOIS kaydı ne?

Kullanım:
  domainlookup <alan>                  Boşta mı? Değilse aynı ad diğer uzantılarda denenir
  domainlookup <alan> <alan> … --fikir Verilen adları (en çok ${TAVAN}) kontrol eder, boşları ayrı listeler
  domainlookup whois <alan>            Kayıt bilgisi: kayıt firması, tarihler, durum, ad sunucuları
Seçenekler:
  --premiumsuz        Premium kontrolü yapma (adları GoDaddy'ye sorma)
  --uzantilar=a,b     Diğer uzantılar listesi (varsayılan: ${VARSAYILAN_UZANTILAR.join(',')})
  --json              Makine okunur çıktı
Çıkış kodu: 0 hepsi kesin · 1 kullanım hatası · 2 en az biri ölçülemedi`;

const cikisKodu = (sonuclar) => (sonuclar.some((s) => s.durum === 'BELIRSIZ') ? 2 : sonuclar.some((s) => s.durum === 'GECERSIZ_YAZIM') ? 1 : 0);

async function whoisKomutu(ham, { ag, veriKlasoru }) {
  const g = normalizeEt(ham ?? '');
  if (g.hata) return { metin: `Kullanım: domainlookup whois <alan> — ${g.hata}`, cikis: 1, json: null };
  const { alan, uzanti } = g;
  const tld = uzanti.split('.').at(-1);
  const o = { ag, trabisSira: Promise.resolve(), trabisSayac: 0 };
  const sonuc = (k) => ({ metin: whoisMetni(alan, k), cikis: k.durumu === 'BELIRSIZ' ? 2 : 0, json: { surum: 1, alan, ...k } });
  try {
    const v = await uzantiVerisiAl({ ag, veriKlasoru });
    const taban = v.rdap?.get(uzanti) ?? v.rdap?.get(tld);
    if (taban && tld !== 'tr') {
      const r = await rdapSor(taban, alan, o);
      if (r.karar === 'BOS') return sonuc({ durumu: 'BOS', kaynak: `RDAP (${new URL(taban).host})` });
      if (r.karar !== 'DOLU') return sonuc({ durumu: 'BELIRSIZ', neden: r.neden });
      const k = { durumu: 'DOLU', kaynak: `RDAP (${new URL(taban).host})`, ...rdapCoz(r.govde) };
      // kayıt kuruluşu sahibi tutmaz (ör. .com) — kayıt firmasının RDAP'ına bir kez gidilir
      const ilgili = r.govde.links?.find((l) => l.rel === 'related' && /rdap/.test(l.type ?? l.href))?.href;
      if (!k.sahip && !k.sahipGizli && ilgili?.startsWith('https://')) {
        const f = await rdapSor(ilgili, alan, o, 1);
        if (f.karar === 'DOLU') {
          const fk = rdapCoz(f.govde);
          Object.assign(k, { sahip: fk.sahip, sahipGizli: fk.sahipGizli });
        } else k.sahipOlcmedi = `kayıt firması cevap vermedi (${f.neden ?? 'kayıt yok'})`;
      }
      return sonuc(k);
    }
    const sunucu = tld === 'tr' ? TRABIS : await v.whoisSunucusu(tld);
    if (!sunucu) return sonuc({ durumu: 'BELIRSIZ', neden: 'uzantının ne RDAP ne WHOIS sunucusu var' });
    const metin = await whoisSor(sunucu, alan, o);
    const karar = whoisKarar(metin);
    if (karar === 'BOS') return sonuc({ durumu: 'BOS', kaynak: `WHOIS (${sunucu})` });
    if (karar !== 'DOLU') return sonuc({ durumu: 'BELIRSIZ', neden: karar === 'GECERSIZ' ? 'kayıt kurumu adı tanımıyor' : 'WHOIS cevabı çözülemedi' });
    return sonuc({ durumu: 'DOLU', kaynak: `WHOIS (${sunucu})`, ...whoisCoz(metin) });
  } catch (e) {
    return sonuc({ durumu: 'BELIRSIZ', neden: e?.cause?.code ?? e?.message ?? String(e) });
  }
}

export async function calistir(argv, { ag = gercekAg(), veriKlasoru = VARSAYILAN_VERI, simdi = new Date() } = {}) {
  const bayraklar = argv.filter((a) => a.startsWith('--'));
  const adlar = argv.filter((a) => !a.startsWith('--'));
  const var_ = (b) => bayraklar.includes(b);
  if (!adlar.length || var_('--yardim') || var_('--help')) return { metin: YARDIM, cikis: adlar.length ? 0 : 1, json: null };
  if (adlar[0] === 'whois') return whoisKomutu(adlar[1], { ag, veriKlasoru });
  if (adlar.length > TAVAN) return { metin: `En çok ${TAVAN} ad sorulabilir (verilen: ${adlar.length}).`, cikis: 1, json: null };

  const fikir = var_('--fikir');
  const premiumsuz = var_('--premiumsuz');
  const uzantilar = bayraklar.find((b) => b.startsWith('--uzantilar='))?.slice(12).split(',').map((x) => x.trim().replace(/^\./, '')).filter(Boolean) ?? VARSAYILAN_UZANTILAR;
  const ortam = { ag, veriKlasoru, simdi: simdi.getTime() };

  let sonuclar = await sorgulaHepsi(adlar, ortam);
  // tek ad sorulduysa ve boş değilse: aynı ad diğer uzantılarda
  if (!fikir && adlar.length === 1 && !['BOS', 'GECERSIZ_YAZIM'].includes(sonuclar[0].durum)) {
    const g = normalizeEt(adlar[0]);
    const digerleri = uzantilar.map((u) => `${g.etiket}.${u}`).filter((a) => a !== g.alan);
    sonuclar = sonuclar.concat(await sorgulaHepsi(digerleri, ortam));
  }
  sonuclar = sonuclar.map((s, i) => ({ no: i + 1, ...s }));

  if (!premiumsuz) {
    const bos = sonuclar.filter((s) => s.durum === 'BOS').map((s) => s.alan);
    const m = await premiumBak(bos, { ag });
    for (const s of sonuclar) if (s.durum === 'BOS') s.premium = m.get(s.alan) ?? null;
  }

  const json = { surum: 1, sorgu: adlar.join(' '), olusturma: simdi.toISOString(), sonuclar };
  const o = { premiumsuz };
  return { metin: fikir ? fikirMetni(json, o) : sorguMetni(json, o), cikis: cikisKodu(sonuclar), json };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const r = await calistir(argv);
  process.stdout.write(`${argv.includes('--json') && r.json ? JSON.stringify(r.json, null, 1) : r.metin}\n`);
  process.exitCode = r.cikis;
}
