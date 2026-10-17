#!/usr/bin/env node
// Ayna eşitleme — bu deponun HEAD'ini başka bir depodaki klasöre birebir taşır (ör. mediaclick-skills/skills/domainlookup).
//   node ayna/esitle.mjs <hedef>             eşitle: yaz, kaynakta olmayanı sil, AYNA.md'yi güncelle
//   node ayna/esitle.mjs <hedef> --denetle   yazmaz; ayrışma var mı ölçer
// Çıkış: 0 eşit / eşitlendi · 1 ayrışmış (yalnız --denetle) · 2 ölçülemedi ya da güvenli değil (hiçbir şey yazılmaz)
// Paket dosyalarına girmez (package.json "files"); yalnız geliştirme aracıdır.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, renameSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const AYNA = 'AYNA.md';
const DISLA = (yol) => yol.startsWith('.github/');
// hedefte kaynakta olmasa da silinmeyen ve ayrışma sayılmayan yollar (önbellek, yerel çöp)
const KORU = (yol) => /^(veri|node_modules|gecici)(\/|$)/.test(yol) || yol === AYNA || yol.split('/').at(-1) === '.DS_Store';

function git(kaynak, ...a) {
  const r = spawnSync('git', a, { cwd: kaynak, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${a[0]}: ${r.stderr?.toString().trim()}`);
  return r.stdout;
}

/** Kaynağın HEAD'indeki dosyalar: yol → içerik (Buffer). */
function kaynakDosyalari(kaynak) {
  const sha = git(kaynak, 'rev-parse', 'HEAD').toString().trim();
  const yollar = git(kaynak, 'ls-tree', '-r', '-z', '--name-only', 'HEAD').toString().split('\0').filter((y) => y && !DISLA(y));
  return { sha, dosyalar: new Map(yollar.map((y) => [y, git(kaynak, 'show', `HEAD:${y}`)])) };
}

/** Hedefteki dosyalar (göreli yol). Sembolik bağ görülürse null — dışarı yazma/silme riski. */
function hedefDosyalari(hedef) {
  const sonuc = [];
  const gez = (d, onek) => {
    for (const ad of readdirSync(d)) {
      const yol = onek ? `${onek}/${ad}` : ad;
      const st = lstatSync(join(d, ad));
      if (st.isSymbolicLink()) throw new Error(`hedefte sembolik bağ var: ${yol}`);
      if (st.isDirectory()) {
        if (!KORU(yol)) gez(join(d, ad), yol);
      } else sonuc.push(yol);
    }
  };
  if (existsSync(hedef)) gez(hedef, '');
  return sonuc;
}

function iceride(hedef, yol) {
  const tam = resolve(hedef, yol);
  const r = relative(hedef, tam);
  return r && !r.startsWith('..') && !isAbsolute(r) && !r.split(sep).includes('..') ? tam : null;
}

const aynaSha = (hedef) => {
  try { return readFileSync(join(hedef, AYNA), 'utf8').match(/^kaynak-sha: ([0-9a-f]{40})$/m)?.[1] ?? null; } catch { return null; }
};

function aynaMetni(sha) {
  const zaman = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).slice(0, 16);
  return `# Ayna — domainlookup

Bu klasör https://github.com/inanc76/domainlookup deposunun **aynasıdır**. Burada düzenleme yapma:
değişiklik kaynak depoda yapılır, sonra bu klasöre eşitlenir. Elle yapılan değişiklik bir sonraki eşitlemede silinir.

kaynak-sha: ${sha}
eşitleme: ${zaman} (Europe/Istanbul)

Eşitle:  node ~/CODEBASE/domainlookup/ayna/esitle.mjs <bu klasör>
Denetle: node ~/CODEBASE/domainlookup/ayna/esitle.mjs <bu klasör> --denetle   (0 eşit · 1 ayrışmış)
Kurulum (Claude Code, global): npx github:inanc76/domainlookup kur
`;
}

/** Ayrışmayı ölçer; yazmaz. */
export function denetle(kaynak, hedef) {
  try {
    const { sha, dosyalar } = kaynakDosyalari(kaynak);
    const var_ = hedefDosyalari(hedef).filter((y) => !KORU(y));
    const satirlar = [];
    for (const [yol, icerik] of dosyalar) {
      const tam = join(hedef, yol);
      if (!existsSync(tam)) satirlar.push(`eksik: ${yol}`);
      else if (!readFileSync(tam).equals(icerik)) satirlar.push(`farklı: ${yol}`);
    }
    for (const yol of var_) if (!dosyalar.has(yol)) satirlar.push(`fazla: ${yol}`);
    const s = aynaSha(hedef);
    if (s !== sha) satirlar.push(`AYNA.md: kaynak-sha ${s ?? 'yok'} · kaynak HEAD ${sha}`);
    return { cikis: satirlar.length ? 1 : 0, satirlar: satirlar.length ? satirlar : [`eşit · ${dosyalar.size} dosya · ${sha.slice(0, 7)}`] };
  } catch (e) {
    return { cikis: 2, satirlar: [`ölçülemedi: ${e.message}`] };
  }
}

/** Kaynağı hedefe birebir taşır. Güvenli değilse hiçbir şey yazmadan 2 döner. */
export function esitle(kaynak, hedef) {
  try {
    if (git(kaynak, 'status', '--porcelain').length) return { cikis: 2, satirlar: ['kaynak ağaç temiz değil — önce kaydet'] };
    if (existsSync(hedef) && readdirSync(hedef).length && aynaSha(hedef) === null) {
      return { cikis: 2, satirlar: [`${hedef} dolu ve ${AYNA} taşımıyor — ayna klasörü değil, dokunulmadı`] };
    }
    const { sha, dosyalar } = kaynakDosyalari(kaynak);
    const var_ = hedefDosyalari(hedef); // sembolik bağ varsa burada durur, hiçbir şey yazılmamıştır
    const satirlar = [];
    for (const [yol, icerik] of dosyalar) {
      const tam = iceride(hedef, yol);
      if (!tam) throw new Error(`kaynakta hedef dışını gösteren yol: ${yol}`);
      if (existsSync(tam) && readFileSync(tam).equals(icerik)) continue;
      mkdirSync(dirname(tam), { recursive: true });
      writeFileSync(`${tam}.tmp`, icerik);
      renameSync(`${tam}.tmp`, tam);
      satirlar.push(`yazıldı: ${yol}`);
    }
    for (const yol of var_) {
      if (dosyalar.has(yol) || KORU(yol)) continue;
      const tam = iceride(hedef, yol);
      if (tam) {
        rmSync(tam, { force: true });
        satirlar.push(`silindi: ${yol}`);
      }
    }
    // boşalan klasörler (korunanlar hariç)
    const bosalt = (d, onek) => {
      for (const ad of readdirSync(d)) {
        const yol = onek ? `${onek}/${ad}` : ad;
        const tam = join(d, ad);
        if (KORU(yol) || !lstatSync(tam).isDirectory()) continue;
        bosalt(tam, yol);
        if (!readdirSync(tam).length) rmSync(tam, { recursive: true });
      }
    };
    bosalt(hedef, '');
    if (aynaSha(hedef) !== sha) writeFileSync(join(hedef, AYNA), aynaMetni(sha));
    return { cikis: 0, satirlar: [`${satirlar.length} değişiklik · ${dosyalar.size} dosya · ${sha.slice(0, 7)}`, ...satirlar] };
  } catch (e) {
    return { cikis: 2, satirlar: [`ölçülemedi: ${e.message}`] };
  }
}

const dogrudan = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (process.argv[1] && dogrudan()) {
  const arg = process.argv.slice(2);
  const hedef = arg.find((a) => !a.startsWith('--'));
  if (!hedef) {
    console.log('Kullanım: node ayna/esitle.mjs <hedef klasör> [--denetle]');
    process.exit(1);
  }
  const kaynak = dirname(dirname(fileURLToPath(import.meta.url)));
  const r = (arg.includes('--denetle') ? denetle : esitle)(kaynak, resolve(hedef));
  console.log(r.satirlar.join('\n'));
  process.exitCode = r.cikis;
}
