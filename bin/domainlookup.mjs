#!/usr/bin/env node
// domainlookup — Claude Code skill'ini kurar / kaldırır; diğer her komutu scripts/domainlookup.mjs'e iletir.
//   domainlookup kur [--proje]      ~/.claude/skills/domainlookup/ (veya ./.claude/skills/domainlookup/) altına kurar
//   domainlookup kaldir [--proje]   yalnız kendi kurduğu dosyaları siler
//   domainlookup <alan…> | whois <alan>   doğrudan sorgu
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, rmdirSync, copyFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KOK = dirname(dirname(fileURLToPath(import.meta.url)));
const SURUM = JSON.parse(readFileSync(join(KOK, 'package.json'), 'utf8')).version;
const MANIFESTO = '.domainlookup-kurulum.json';
const GLOBAL_YOL = '~/.claude/skills/domainlookup/';
const PROJE_YOL = '.claude/skills/domainlookup/';

const urunDosyalari = () => [
  'SKILL.md',
  'package.json',
  ...readdirSync(join(KOK, 'scripts')).filter((f) => f.endsWith('.mjs')).map((f) => `scripts/${f}`),
  ...readdirSync(join(KOK, 'liste')).filter((f) => f.endsWith('.json')).map((f) => `liste/${f}`),
];
const hedefYolu = (proje) => (proje ? resolve(process.cwd(), '.claude', 'skills', 'domainlookup') : join(homedir(), '.claude', 'skills', 'domainlookup'));
const goster = (yol) => yol.replace(homedir(), '~');
const ozet = (icerik) => createHash('sha256').update(icerik).digest('hex').slice(0, 16);
const damga = () => new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 16).replace(/[-:]/g, '').replace(' ', '-');

/** Manifestodaki yol kurulum klasörünün İÇİNDE mi? Değilse dokunulmaz. */
function iceride(hedef, yol) {
  const tam = resolve(hedef, yol);
  const r = relative(hedef, tam);
  return r && !r.startsWith('..') && !isAbsolute(r) && !r.split(sep).includes('..') ? tam : null;
}

function manifestoOku(hedef) {
  try {
    const m = JSON.parse(readFileSync(join(hedef, MANIFESTO), 'utf8'));
    return Array.isArray(m.dosyalar) ? m : null;
  } catch {
    return null;
  }
}

function kur(proje) {
  const hedef = hedefYolu(proje);
  const eski = manifestoOku(hedef);
  if (!eski && existsSync(hedef) && readdirSync(hedef).length) {
    console.log(`⛔ ${goster(hedef)} dolu ve domainlookup kurulumu değil — hiçbir şey yazılmadı.`);
    console.log('   Klasörü kendin taşı ya da sil, sonra tekrar kur.');
    return 2;
  }
  const eskiOzet = new Map((eski?.dosyalar ?? []).map((d) => [d.yol, d.ozet]));
  const dosyalar = [];
  const yedekler = [];
  for (const f of urunDosyalari()) {
    let icerik = readFileSync(join(KOK, f));
    if (f === 'SKILL.md' && proje) icerik = Buffer.from(icerik.toString('utf8').split(GLOBAL_YOL).join(PROJE_YOL));
    const yol = join(hedef, f);
    mkdirSync(dirname(yol), { recursive: true });
    // kullanıcı kurulu dosyayı değiştirdiyse üzerine yazmadan önce yedeklenir
    if (existsSync(yol) && eskiOzet.has(f) && ozet(readFileSync(yol)) !== eskiOzet.get(f)) {
      const y = `${yol}.yedek-${damga()}`;
      copyFileSync(yol, y);
      yedekler.push(goster(y));
    }
    writeFileSync(`${yol}.tmp`, icerik);
    renameSync(`${yol}.tmp`, yol);
    dosyalar.push({ yol: f, ozet: ozet(icerik) });
  }
  // eski sürümde olup yenisinde olmayan dosyalar
  for (const d of eski?.dosyalar ?? []) {
    if (dosyalar.some((x) => x.yol === d.yol)) continue;
    const tam = iceride(hedef, d.yol);
    if (tam) rmSync(tam, { force: true });
  }
  writeFileSync(join(hedef, MANIFESTO), `${JSON.stringify({ surum: SURUM, dosyalar }, null, 1)}\n`);
  console.log(`✅ domainlookup ${SURUM} kuruldu → ${goster(hedef)}`);
  console.log(`   ${dosyalar.length} dosya · önbellek (veri/) ve senin eklediğin dosyalar korundu`);
  for (const y of yedekler) console.log(`   değiştirdiğin dosya yedeklendi: ${y}`);
  console.log('   Claude Code\'da yeni oturum aç ve yaz: /domainlookup zono.com');
  return 0;
}

function kaldir(proje) {
  const hedef = hedefYolu(proje);
  const m = manifestoOku(hedef);
  if (!m) {
    console.log(`➖ ${goster(hedef)} altında domainlookup kurulumu yok — yapılacak bir şey yok`);
    return 0;
  }
  const atlanan = [];
  for (const d of m.dosyalar) {
    const tam = iceride(hedef, d.yol);
    if (tam) rmSync(tam, { force: true });
    else atlanan.push(d.yol);
  }
  rmSync(join(hedef, 'veri'), { recursive: true, force: true });
  rmSync(join(hedef, MANIFESTO), { force: true });
  for (const d of [join(hedef, 'scripts'), join(hedef, 'liste'), hedef]) {
    try { if (!readdirSync(d).length) rmdirSync(d); } catch { /* yok ya da boş değil — bırak */ }
  }
  const kalan = existsSync(hedef) ? readdirSync(hedef) : [];
  console.log(`✅ domainlookup kaldırıldı → ${goster(hedef)}${kalan.length ? ` (senin dosyaların kaldı: ${kalan.join(', ')})` : ''}`);
  for (const a of atlanan) console.log(`   ⚠️ kurulum klasörü dışını gösteren kayıt atlandı: ${a}`);
  return 0;
}

const arg = process.argv.slice(2);
const komut = arg.find((a) => !a.startsWith('-'));
if (komut === 'kur' || komut === 'install') process.exitCode = kur(arg.includes('--proje'));
else if (komut === 'kaldir' || komut === 'uninstall') process.exitCode = kaldir(arg.includes('--proje'));
else {
  const { calistir } = await import(pathToFileURL(join(KOK, 'scripts', 'domainlookup.mjs')).href);
  const r = await calistir(arg);
  process.stdout.write(`${arg.includes('--json') && r.json ? JSON.stringify(r.json, null, 1) : r.metin}\n`);
  if (!komut) process.stdout.write('\nKurulum: domainlookup kur [--proje] · kaldırma: domainlookup kaldir [--proje]\n');
  process.exitCode = r.cikis;
}
