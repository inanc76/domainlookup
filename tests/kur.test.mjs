// K-KUR · K-LISTE — geçici HOME'da kurulur; gerçek ~/.claude'a dokunulmaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geciciKlasor } from './yardimci.mjs';

const BIN = join(dirname(dirname(fileURLToPath(import.meta.url))), 'bin', 'domainlookup.mjs');
const kos = (ev, ...arg) => spawnSync(process.execPath, [BIN, ...arg], { env: { ...process.env, HOME: ev }, encoding: 'utf8', cwd: ev });
const hedefYolu = (ev) => join(ev, '.claude', 'skills', 'domainlookup');

test('K-KUR: kurulan kopya depo dışından çalışır', () => {
  const k = geciciKlasor();
  try {
    const r = kos(k.yol, 'kur');
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const hedef = hedefYolu(k.yol);
    for (const f of ['SKILL.md', 'scripts/domainlookup.mjs', 'scripts/sorgu.mjs', 'liste/kapali-uzantilar.json', 'liste/godaddy-satmaz.json', 'package.json', '.domainlookup-kurulum.json']) {
      assert.ok(existsSync(join(hedef, f)), `eksik: ${f}`);
    }
    // depo dışındaki bir klasörden kurulu betik: tüm import'lar ve listeler çözülmeli
    const y = spawnSync(process.execPath, [join(hedef, 'scripts', 'domainlookup.mjs'), '--yardim'], { cwd: k.yol, encoding: 'utf8' });
    assert.equal(y.status, 0, y.stderr);
    assert.match(y.stdout, /domainlookup — alan adı boşta mı/);
    // SKILL.md kurulu yolu çağırır
    assert.match(readFileSync(join(hedef, 'SKILL.md'), 'utf8'), /node ~\/\.claude\/skills\/domainlookup\/scripts\/domainlookup\.mjs/);
  } finally {
    k.sil();
  }
});

test('K-KUR: kaldir yalnız kendi dosyalarını siler; yabancı dosya ve kurulum dışı yol korunur', () => {
  const k = geciciKlasor();
  try {
    assert.equal(kos(k.yol, 'kur').status, 0);
    const hedef = hedefYolu(k.yol);
    writeFileSync(join(hedef, 'yabanci.txt'), 'kullanıcının dosyası');
    mkdirSync(join(hedef, 'veri'), { recursive: true });
    writeFileSync(join(hedef, 'veri', 'iana-tlds.txt'), 'önbellek');
    // manifestoya kurulum dışını gösteren yol sokulur
    const kurban = join(k.yol, 'kurban.txt');
    writeFileSync(kurban, 'silinmemeli');
    const mPath = join(hedef, '.domainlookup-kurulum.json');
    const m = JSON.parse(readFileSync(mPath, 'utf8'));
    m.dosyalar.push({ yol: '../../../kurban.txt', ozet: 'x' });
    writeFileSync(mPath, JSON.stringify(m));

    const r = kos(k.yol, 'kaldir');
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.ok(existsSync(kurban), 'kurulum dışındaki dosya silinmemeli');
    assert.ok(existsSync(join(hedef, 'yabanci.txt')), 'yabancı dosya korunmalı');
    assert.ok(!existsSync(join(hedef, 'SKILL.md')));
    assert.ok(!existsSync(join(hedef, 'scripts')));
    assert.ok(!existsSync(mPath));
    assert.deepEqual(readdirSync(hedef).sort(), ['yabanci.txt']);
  } finally {
    k.sil();
  }
});

test('K-KUR: manifestosuz dolu hedef klasöre yazmaz (çıkış 2)', () => {
  const k = geciciKlasor();
  try {
    const hedef = hedefYolu(k.yol);
    mkdirSync(hedef, { recursive: true });
    writeFileSync(join(hedef, 'SKILL.md'), 'başkasının skill\'i');
    const r = kos(k.yol, 'kur');
    assert.equal(r.status, 2, r.stdout);
    assert.equal(readFileSync(join(hedef, 'SKILL.md'), 'utf8'), 'başkasının skill\'i');
  } finally {
    k.sil();
  }
});

test('K-KUR: yeniden kurulumda kullanıcının değiştirdiği dosya yedeklenir', () => {
  const k = geciciKlasor();
  try {
    assert.equal(kos(k.yol, 'kur').status, 0);
    const hedef = hedefYolu(k.yol);
    writeFileSync(join(hedef, 'SKILL.md'), 'elle değiştirildi');
    assert.equal(kos(k.yol, 'kur').status, 0);
    const yedek = readdirSync(hedef).find((f) => /^SKILL\.md\.yedek-\d{8}-\d{4}$/.test(f));
    assert.ok(yedek, `yedek yok: ${readdirSync(hedef)}`);
    assert.equal(readFileSync(join(hedef, yedek), 'utf8'), 'elle değiştirildi');
    assert.notEqual(readFileSync(join(hedef, 'SKILL.md'), 'utf8'), 'elle değiştirildi');
  } finally {
    k.sil();
  }
});
