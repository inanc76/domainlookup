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
