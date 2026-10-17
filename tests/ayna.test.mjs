// K-AYNA-BIRIM — ayna eşitleme: kaynak depo HEAD'i hedef klasöre birebir taşınır, hedef dışına dokunulmaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { esitle, denetle } from '../ayna/esitle.mjs';
import { geciciKlasor } from './yardimci.mjs';

const git = (cwd, ...a) => {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
};

/** Küçük bir kaynak depo: SKILL.md, scripts/a.mjs, .github/workflows/t.yml */
function kaynakDepo(kok) {
  const k = join(kok, 'kaynak');
  for (const [yol, icerik] of [['SKILL.md', 'skill\n'], ['scripts/a.mjs', 'export const a = 1;\n'], ['.github/workflows/t.yml', 'on: push\n']]) {
    mkdirSync(dirname(join(k, yol)), { recursive: true });
    writeFileSync(join(k, yol), icerik);
  }
  git(k, 'init', '-q');
  git(k, 'add', '.');
  git(k, '-c', 'user.name=t', '-c', 'user.email=ornek@ornek.invalid', 'commit', '-qm', 'ilk');
  return k;
}

test('K-AYNA: boş hedefe eşitleme → denetle 0, .github taşınmaz, AYNA.md sha taşır', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    const h = join(t.yol, 'ayna', 'domainlookup');
    assert.equal(esitle(k, h).cikis, 0);
    assert.equal(readFileSync(join(h, 'scripts/a.mjs'), 'utf8'), 'export const a = 1;\n');
    assert.ok(!existsSync(join(h, '.github')), '.github aynaya girmemeli');
    assert.match(readFileSync(join(h, 'AYNA.md'), 'utf8'), new RegExp(`kaynak-sha: ${git(k, 'rev-parse', 'HEAD')}`));
    assert.equal(denetle(k, h).cikis, 0);
  } finally {
    t.sil();
  }
});

test('K-AYNA: hedefte değişen, eksik ve fazla dosya denetle 1 verir; eşitleme fazlayı siler, veri/ korunur', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    const h = join(t.yol, 'domainlookup');
    esitle(k, h);
    writeFileSync(join(h, 'SKILL.md'), 'elle değişti\n');
    const d1 = denetle(k, h);
    assert.equal(d1.cikis, 1);
    assert.ok(d1.satirlar.some((s) => /farklı.*SKILL\.md/.test(s)), d1.satirlar.join('\n'));
    writeFileSync(join(h, 'fazla.txt'), 'x');
    mkdirSync(join(h, 'veri'));
    writeFileSync(join(h, 'veri', 'onbellek.txt'), 'kalmalı');
    assert.ok(denetle(k, h).satirlar.some((s) => /fazla.*fazla\.txt/.test(s)));
    assert.equal(esitle(k, h).cikis, 0);
    assert.ok(!existsSync(join(h, 'fazla.txt')), 'fazla dosya silinmeli');
    assert.equal(readFileSync(join(h, 'SKILL.md'), 'utf8'), 'skill\n');
    assert.equal(readFileSync(join(h, 'veri', 'onbellek.txt'), 'utf8'), 'kalmalı');
    assert.equal(denetle(k, h).cikis, 0);
  } finally {
    t.sil();
  }
});

test('K-AYNA: kaynakta yeni commit → AYNA.md sha eski, denetle 1', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    const h = join(t.yol, 'domainlookup');
    esitle(k, h);
    writeFileSync(join(k, 'scripts/b.mjs'), 'export const b = 2;\n');
    git(k, 'add', 'scripts/b.mjs');
    git(k, '-c', 'user.name=t', '-c', 'user.email=ornek@ornek.invalid', 'commit', '-qm', 'iki');
    const d = denetle(k, h);
    assert.equal(d.cikis, 1);
    assert.ok(d.satirlar.some((s) => /eksik.*scripts\/b\.mjs/.test(s)), d.satirlar.join('\n'));
  } finally {
    t.sil();
  }
});

test('K-AYNA: kirli kaynak → 2, hiçbir şey yazılmaz', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    writeFileSync(join(k, 'SKILL.md'), 'kaydedilmemiş\n');
    const h = join(t.yol, 'domainlookup');
    assert.equal(esitle(k, h).cikis, 2);
    assert.ok(!existsSync(h));
  } finally {
    t.sil();
  }
});

test('K-AYNA: AYNA.md taşımayan dolu hedef → 2, dosyalara dokunulmaz', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    const h = join(t.yol, 'baskasi');
    mkdirSync(h);
    writeFileSync(join(h, 'onemli.txt'), 'silinmemeli');
    assert.equal(esitle(k, h).cikis, 2);
    assert.deepEqual(readdirSync(h), ['onemli.txt']);
  } finally {
    t.sil();
  }
});

test('K-AYNA: hedefteki sembolik bağ üzerinden dışarı yazılmaz → 2', () => {
  const t = geciciKlasor();
  try {
    const k = kaynakDepo(t.yol);
    const h = join(t.yol, 'domainlookup');
    esitle(k, h);
    const dis = join(t.yol, 'dis');
    mkdirSync(dis);
    spawnSync('rm', ['-rf', join(h, 'scripts')]);
    symlinkSync(dis, join(h, 'scripts'));
    assert.equal(esitle(k, h).cikis, 2);
    assert.deepEqual(readdirSync(dis), [], 'hedef dışına dosya yazılmamalı');
  } finally {
    t.sil();
  }
});
