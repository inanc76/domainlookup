# Kırmızı taban kütüğü

Her ölçüt: ad · tarih-saat · komut · ham çıktı (kırmızı, sonra yeşil). WHOIS sahip alanları `***`.

## K-EXCLUDE · 2026-10-17

Kırmızı (exclude yazılmadan önce):
```
$ touch gecici/x veri/y; git status --porcelain
?? gecici/
?? veri/
EXIT:0
```
Yeşil (`.git/info/exclude`'a `gecici/` `veri/` eklendikten sonra):
```
$ git status --porcelain
EXIT:0   (boş)
```

## Madde 3 ön ölçümü — .data / .search satış durumu · 2026-10-17

```
.data:   0/15 kelimede ad var (NOERROR)
.search: 0/15 kelimede ad var (NOERROR)
.kim:   12/15 kelimede ad var (NOERROR)
nic.search → 302 https://www.google.com/registry/
whois.nic.data zono.data → ">>> Domain zono.data is available for registration"
GoDaddy MCP zono.data → unavailable
```
Hüküm: `zono.data` → `KAYDA_KAPALI`, `foo.search` → `KAYDA_KAPALI` (K-UZANTI beklenen değerleri).

## K-BIRIM · 2026-10-17 · taslak modüllere karşı (her ada BOS diyen sorgu.mjs vb.)

```
$ npm test
# tests 53
# pass 2
# fail 51
EXIT:1
ok 37 - (koruma) K-UZANTI ters tanık: açık uzantılar kapalı ya da yok sayılmaz
ok 53 - (koruma) rdap.org hiçbir zaman sorulmaz (RDAP'ı olmayan uzantı WHOIS'e gider)
ERR_MODULE_NOT_FOUND sayısı: 0
not ok 1 - K-ALTERNATIF: kapalı uzantı → aynı ad diğer uzantılarda numaralı denenir
not ok 2 - istenen ad boşsa yalnız o satır yazılır
not ok 3 - K-PREMIUM: premium ad boş kalır, 💎 etiketi alır
not ok 4 - --premiumsuz GoDaddy'ye hiç sormaz
not ok 5 - K-JSON: sözleşme
not ok 6 - K-CIKIS: zaman aşımı → çıkış 2 ve ⚠️ ölçülemedi
not ok 7 - K-CIKIS: geçersiz yazım → çıkış 1
not ok 8 - K-TAVAN: 61 ad → çıkış 1, ağa hiç istek yok
not ok 9 - --fikir uzantı genişlemesi yapmaz, boşları ayrı başlıkta verir
not ok 10 - K-WHOIS: dolu adın kaydı — kayıt firması, tarihler, durum, ad sunucuları
not ok 11 - K-WHOIS: .com.tr kaydı TRABİS'ten gelir
not ok 12 - K-TEMIZ: WHOIS içindeki kaçış dizileri ekrana gitmez
not ok 13 - kullanım: argümansız → çıkış 1
not ok 14 - düz alan adı küçük harfe iner, uzantı ayrılır
not ok 15 - şema, yol, www ve sondaki nokta atılır
not ok 16 - .tr ikinci seviyesi tek uzantı sayılır
not ok 17 - Türkçe karakter punycode (xn--) olarak sorgulanır
not ok 18 - başka ülkenin ikinci seviyesi desteklenmiyor diye işaretlenir
not ok 19 - zararlı ve bozuk girdiler reddedilir
not ok 20 - TRABİS cevapları: boş · dolu · geçersiz
not ok 21 - önce dolu ifadesine bakılır: kayıtta "No match" geçse de DOLU
not ok 22 - tanınmayan ya da boş metin karar vermez
not ok 23 - TRABİS kaydı ayrıştırılır: kayıt firması, ad sunucuları, durum
not ok 24 - RDAP kaydı ayrıştırılır: tarih, kayıt firması, ad sunucuları, durum
not ok 25 - dış kaynaktan gelen alan kontrol karakterinden arınır ve 200 karakterle kesilir
not ok 26 - K-PREMIUM: love.dev premium, zonokim.com standart
not ok 27 - K-GODADDY-TR: .tr ailesi GoDaddy'ye hiç gönderilmez, aynı partideki .com gönderilir
not ok 28 - GoDaddy tam eşleşme satırı vermezse premium ölçülmedi (null)
not ok 29 - GoDaddy hatası premium ölçülmedi yapar, istisna fırlatmaz
not ok 30 - K-TR: dolu .com.tr → DOLU (TRABİS)
not ok 31 - K-TR: boş .com.tr → BOS
not ok 32 - K-TR: olmayan .tr ikinci seviyesi → UZANTI_YOK
not ok 33 - K-COM: ad sunucusu olan .com → DOLU
not ok 34 - K-COM: ad sunucusu yok + Verisign 404 → BOS (RDAP)
not ok 35 - K-UZANTI: IANA listesinde olmayan uzantı → UZANTI_YOK, kayıt sorgusu yok
not ok 36 - K-UZANTI: .data ve .search → KAYDA_KAPALI
not ok 38 - desteklenmeyen ikinci seviye (co.uk) → BELIRSIZ
not ok 39 - Türkçe karakterli ad TRABİS'e punycode olarak gider
not ok 40 - K-KONTROL: her şeye "No match" diyen sunucu → BOS değil BELIRSIZ
not ok 41 - K-KONTROL: RDAP sunucusu kontrol adına da 404 diyorsa → BELIRSIZ
not ok 42 - K-BELIRSIZ: WHOIS bağlantı hatası
not ok 43 - K-BELIRSIZ: WHOIS boş metin
not ok 44 - K-BELIRSIZ: RDAP 500
not ok 45 - K-BELIRSIZ: RDAP 429 + Retry-After 3600 → beklemeden
not ok 46 - K-BELIRSIZ: DoH hatası + RDAP 404 → BOS değil
not ok 47 - K-BELIRSIZ: DoH SERVFAIL (Status 2) → BOS değil
not ok 48 - K-BELIRSIZ: IANA uzantı listesi alınamazsa
not ok 49 - K-BELIRSIZ: bozuk önbellek + indirme hatası → çökmez, BOS demez
not ok 50 - 429 + kısa Retry-After → bir kez bekleyip yeniden dener
not ok 51 - K-GIRDI: bozuk girdi ağa hiç çıkmaz
not ok 52 - dolu ad park sunucusundaysa "satılık olabilir" notu düşülür
```
Geçen 2 test (koruma) etiketli; kalan 51 beklenti hatasıyla kırmızı.

Kırmızı taban commit'i: `ec66427` (`git show ec66427:scripts/sorgu.mjs` → her ada BOS diyen taslak).

## K-TR kırmızı · 2026-10-17 · techlookup'ın değiştirilmemiş mantığı

```
$ node -e "…techlookup/scripts/kimlik.mjs alanAdiSorgula('zonoyok1792235948.com.tr')"
{"durum":"ölçülemedi (TRABİS kaydı yok)","alan":"zonoyok1792235948.com.tr"}
$ whois -h whois.trabis.gov.tr zonoyok1792235948.com.tr
No match found for zonoyok1792235948.com.tr
```
Eski mantık boş adı "ölçülemedi" sayıyor; yeni motor aynı ad için `BOS` vermeli (yeşil satırı canlı ölçümde eklenir).

## K-BIRIM yeşil · 2026-10-17 · gerçek motor

```
$ npm test
# tests 54   # pass 54   # fail 0   EXIT:0
```

## K-PREMIUM bozma deneyi (5b) · 2026-10-17

`gecici/mutant` kopyasında `domainlookup.mjs`: premium ölçülmediyse `durum = 'DOLU'` (GoDaddy'ye karar verdirme).
```
$ npm test   (bozuk kopya)
not ok 1 - K-ALTERNATIF: kapalı uzantı → aynı ad diğer uzantılarda numaralı denenir
not ok 4 - K-PREMIUM: GoDaddy "alınamaz" dese de kayıt kurumu boş diyorsa BOS kalır
# pass 52  # fail 2   EXIT:1
```
Kopya silindi.

## Koruma ölçütleri · 2026-10-17

```
$ grep -rn "child_process\|execFile" scripts bin; echo EXIT:$?     → EXIT:1 (eşleşme yok)
$ /usr/bin/grep -rnF 'rdap.org' scripts bin; echo EXIT:$?           → EXIT:1 (eşleşme yok)
```

## Canlı ölçütler yeşil · 2026-10-17 14:25 · `npm run canli`

```
ok 1 - K-TR canlı: boş · dolu · olmayan ikinci seviye
ok 2 - K-COM canlı: zono.com dolu, rastgele .com boş
ok 3 - K-UZANTI canlı: zono.zzzz yok · zono.data ve foo.search kapalı · zono.kim açık
ok 4 - K-PREMIUM canlı: love.dev premium · rastgele .com standart
ok 5 - K-ALTERNATIF canlı: zono.data → numaralı liste, dolu satırda whoisN
ok 6 - K-WHOIS canlı: zono.com ve mediaclick.com.tr kaydı
# tests 6  # pass 6  # fail 0  # skipped 0   EXIT:0
```
K-TR kırmızı→yeşil: techlookup mantığı boş .com.tr'ye "ölçülemedi" diyordu; yeni motor `BOS` diyor (ok 1).
Çapraz kontrol: `whois -h whois.trabis.gov.tr zono.com.tr` → Active (motor: dolu) · `zono.net.tr` → No match (motor: boşta).
Rastgele ad 13 uzantıda (com net org com.tr net.tr io co app ai dev me kim tr) → 13/13 boşta, kontrol sorguları geçti.
