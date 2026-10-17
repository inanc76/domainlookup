# domainlookup

**Bir alan adı boşta mı, kaydı kimde, fikrine uygun boş adlar neler?** Üç soruyu tek araçla cevaplar.
`.com.tr` dahil her uzantıyı doğrudan kayıt kurumuna sorar ve emin olamadığı adı **asla "boş" demez**.

Terminalde tek başına çalışır, ya da [Claude Code](https://claude.com/claude-code) içinde `/domainlookup` komutu olur.

```bash
npx github:inanc76/domainlookup zono.data
```

```
## 🔎 zono.data  (sorgu 2026-10-17 14:05)

1. zono.data — ⛔ kayda kapalı — uzantı Dish DBS'ye ait, halka satılmıyor
2. zono.com — ❌ dolu — WHOIS için "whois2" yazın
3. zono.net — ❌ dolu — WHOIS için "whois3" yazın
4. zono.org — ❌ dolu — WHOIS için "whois4" yazın
5. zono.com.tr — ❌ dolu — WHOIS için "whois5" yazın
6. zono.net.tr — ✅ boşta · premium ölçülmedi
…
```

> 🇬🇧 English summary at the [bottom](#english-summary).

---

## Kurulum

Node.js 22 ya da üstü yeterli; başka bağımlılık yok.

| Ne istiyorsun | Komut |
|---|---|
| Kurmadan bir kez sor | `npx github:inanc76/domainlookup zono.com` |
| Claude Code'a `/domainlookup` komutunu kur | `npx github:inanc76/domainlookup kur` |
| pnpm ile | `pnpm dlx github:inanc76/domainlookup kur` |
| Bun ile | `bunx github:inanc76/domainlookup kur` |
| Kalıcı komut olarak kur | `npm i -g github:inanc76/domainlookup` → sonra `domainlookup zono.com` |
| Yalnız bu projeye kur | `npx github:inanc76/domainlookup kur --proje` |
| Kaldır | `npx github:inanc76/domainlookup kaldir` |

Komutların başındaki `kur` yerine bir alan adı yazarsan kurmadan doğrudan sorar (ör. `pnpm dlx github:inanc76/domainlookup zono.com`).

`kur` skill'i `~/.claude/skills/domainlookup/` altına kopyalar (`--proje` ile `./.claude/skills/`).
Yeniden çalıştırınca dosyaları tazeler; elle değiştirdiğin bir dosya varsa önce `<dosya>.yedek-YYYYMMDD-HHMM`
olarak saklar. O klasörde domainlookup'a ait olmayan dosyalar varsa hiçbir şey yazmadan durur (çıkış 2).
`kaldir` yalnız kendi kurduğu dosyaları siler.

## Kullanım

**Claude Code içinde:**

```
/domainlookup zono.com boş mu?
whois2
/domainlookup içinde zono geçen, kişi arama motoru olarak kullanabileceğim alan adı bul
```

Üçüncü istekte Claude 30–40 aday üretir, hepsini tek komutla kontrol ettirir ve yalnız betiğin boş dediği adları önerir.

**Terminalde:**

```bash
domainlookup zono.data                     # boşta mı? değilse aynı ad diğer uzantılarda
domainlookup zono.data --uzantilar=com,kim # hangi uzantıların deneneceğini sen seç
domainlookup whois zono.com                # kayıt firması, tarihler, durum, ad sunucuları
domainlookup zonokim.com findzono.com --fikir   # aday listesini kontrol et (en çok 60 ad)
domainlookup zono.com --json               # makine okunur çıktı
domainlookup zono.com --premiumsuz         # GoDaddy'ye hiç sorma
```

Çıkış kodu: `0` hepsi kesin · `1` kullanım hatası ya da yazım geçersiz · `2` en az bir ad ölçülemedi.

## Ne çıkar

Üç soru, üç çıktı. Örnekler gerçek sorgulardan (2026-10-17), kısaltıldı.

**1 · Boşta mı?** İstenen ad boşsa tek satır gelir. Değilse aynı ad diğer uzantılarda denenir; dolu satırların
yanında WHOIS için yazılacak kısa komut durur.

```
## 🔎 zono.data  (sorgu 2026-10-17 14:35)

1. zono.data — ⛔ kayda kapalı — uzantı Dish DBS'ye ait, halka satılmıyor
2. zono.com — ❌ dolu — WHOIS için "whois2" yazın
3. zono.net — ❌ dolu — WHOIS için "whois3" yazın
5. zono.com.tr — ❌ dolu — WHOIS için "whois5" yazın
6. zono.net.tr — ✅ boşta · premium ölçülmedi
```

**2 · WHOIS kaydı.** Claude Code'da `whois2` yazmak yeter; terminalde `domainlookup whois zono.com`.

```
## 📄 WHOIS — zono.com

| Alan | Değer |
|---|---|
| Kayıt firması | Network Solutions, LLC |
| Kayıt tarihi | 1995-12-08 |
| Bitiş tarihi | 2027-12-07 |
| Durum | client transfer prohibited |
| Ad sunucuları | ns21.worldnic.com, ns22.worldnic.com |
| Sahip | 🔒 gizli |
| Kaynak | RDAP (rdap.verisign.com) |
```

**3 · Fikre uygun boş adlar.** Yalnız Claude Code'da. İstek: *"içinde zono geçen, kişi arama motoru olarak
kullanabileceğim alan adı bul"*. Claude 40 aday üretti; betik 35'ini boş, 5'ini dolu buldu. İlk beş öneri:

| Ad | Premium | Neden |
|---|---|---|
| zonokim.com | standart | "Zono kim?" sorusu kişi aramanın kendisi |
| zono.kim | standart | Markanın en kısa hâli; uzantı "kim" sorusunu taşıyor |
| zonobul.com | standart | Türkçe "bul" fiili ne iş yaptığını anlatıyor |
| zonorehber.com | standart | "Rehber" kişi bulmayla özdeş bir kelime |
| findzono.com | standart | Yurt dışı için anlaşılır İngilizce karşılık |

Claude kendi tahminiyle "boş" yazamaz: listedeki her ad betiğe sorulmuş ve betiğin cevabıyla gösterilir.
Altına her seferinde TÜRKPATENT (marka çakışması) ve KVKK (kişi arama hizmeti) notu düşülür.

**Etiketler:**

| Etiket | Anlamı |
|---|---|
| ✅ boşta · standart | Kayıt kurumunda kaydı yok, normal fiyatla satılıyor |
| 💎 boşta ama premium | Kayıtsız, ama kayıt firması normalden pahalı satıyor |
| 🔨 boşta ama açık artırmada | Kayıtsız, ama yalnız açık artırmayla alınabiliyor |
| ✅ boşta · premium ölçülmedi | Kayıtsız; premium mu bakılmadı (`.tr` adları ya da GoDaddy cevap vermedi) |
| ❌ dolu | Birinin kaydı var — yanındaki `whoisN` ile kaydı görülür |
| ⛔ kayda kapalı | Uzantı var ama halka satılmıyor (marka uzantıları, `.data`, `.search`) |
| 🚫 böyle bir uzantı yok | IANA listesinde böyle bir uzantı yok (ör. `zono.zzzz`) |
| ⚠️ ölçülemedi | Sunucu cevap vermedi ya da cevap anlaşılmadı — nedeni yanında yazar |

⚠️ ile ✅ asla karışmaz: ölçülemeyen bir ad hiçbir zaman "boşta" diye yazılmaz.

## Nasıl karar veriyor

| Sıra | Bakılan | Sonuç |
|---|---|---|
| 1 | Yazım (harf, uzunluk, Türkçe karakter → `xn--`) | 🚫 yazım geçersiz |
| 2 | Uzantı IANA listesinde mi | 🚫 böyle bir uzantı yok |
| 3 | Uzantı halka satılıyor mu (ICANN marka uzantıları + elle eklenenler) | ⛔ kayda kapalı |
| 4 | DNS'te ad sunucusu var mı | ❌ dolu |
| 5 | Kayıt kurumunun RDAP'ı (yoksa WHOIS; `.tr` için TRABİS) | ❌ dolu / boş adayı |
| 6 | Aynı sunucuya bilinen dolu bir ad sorulur — o da "boş" çıkarsa sunucuya güvenilmez | ⚠️ ölçülemedi |
| 7 | Ad sunucusu yok **ve** kayıt kurumu "kayıt yok" diyor | ✅ boşta |

Zaman aşımı, hız sınırı, anlaşılmayan cevap: hepsi **⚠️ ölçülemedi** olur, hiçbiri "boşta" sayılmaz.

**Premium:** boş çıkan adlar GoDaddy'nin anahtarsız ucuna sorulur; cevap `💎 premium (yüksek fiyat)`,
`🔨 açık artırmada` ya da `✅ standart` olur. Fiyatın kendisi gösterilmez. GoDaddy hiçbir zaman boş/dolu kararı
vermez. `.tr` adları GoDaddy satmadığı için **hiç gönderilmez**.

**Gizlilik:** sorduğun adlar kayıt kurumlarına, Cloudflare DNS'ine ve (premium açıksa) GoDaddy'ye gider.
Kayıt firmalarının arama sayfalarına ad gönderilmez. Sorgu sonuçları diske yazılmaz; yalnız IANA listeleri bir gün
önbellekte tutulur (`veri/`).

## Bağımlılık politikası

npm bağımlılığı yok, lockfile yok — bilinçli. Araç Node'un kendi `fetch` ve `node:net` modülleriyle çalışır.
Bağımlılık eklemek, ağa ad gönderen bir araçta tedarik zinciri riskini büyütür. GitHub Actions adımları sürüm etiketi
yerine 40 haneli commit kimliğiyle sabitlenmiştir.

## Geliştirme

```bash
npm test        # ağsız birim testleri (ağ çağrısı testi düşürür)
npm run canli   # gerçek sunuculara giden testler — ağ yoksa "ölçülemedi" diye atlanır
node liste/guncelle.mjs   # kayda kapalı uzantı listesini ICANN'den tazele, farkı gösterir
```

**Ayna:** `mediaclick-skills/skills/domainlookup/` bu deponun birebir kopyasıdır. Her sürümden sonra:

```bash
node ayna/esitle.mjs ../mediaclick-skills/skills/domainlookup            # eşitle (kaynak ağaç temiz olmalı)
node ayna/esitle.mjs ../mediaclick-skills/skills/domainlookup --denetle  # 0 eşit · 1 ayrışmış
```

Kararlar ve kanıtları: [`docs/Kararlar.md`](docs/Kararlar.md).

## Kaynaklar ve teşekkür

- `scripts/kayit.mjs` içindeki WHOIS/RDAP ayrıştırıcıları [inanc76/techlookup](https://github.com/inanc76/techlookup)
  (`scripts/kimlik.mjs`, `de695ed`) deposundan kopyalandı; "No match found" burada "boşta" anlamına gelir.
- Kalıp ve fikir alınan depolar (kod kopyalanmadı): coreyhaines31/makerskills, thattimc/skills, iannuttall/unclaimed,
  georgekhananaev/claude-skills-vault, lennondotw/skills, paveldevyatov/ai-domain-name-generator, AminulBD/ds,
  dorukardahan/domain-search-mcp.

Lisans: MIT.

---

## English summary

`domainlookup` answers three questions: is a domain free, who holds it (WHOIS/RDAP), and which free domains fit an idea.
It queries registries directly (RDAP, WHOIS port 43, TRABIS for `.tr`), separates "no such TLD" and "closed TLD" from
"free", and never reports a name as free when any check failed. Free names are optionally checked for premium status
through GoDaddy's keyless endpoint (never for `.tr`). Zero dependencies, Node ≥22.
`npx github:inanc76/domainlookup kur` installs it as a Claude Code skill.
