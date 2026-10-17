# Kararlar

Her karar: tarih · karar · kanıt (komut + çıktı satırı).

## 2026-10-17 · Kendi motorumuz, bağımlılık yok

- **Karar:** Node ≥22 `fetch` + `node:net` ile kendi sorgu motoru. npm bağımlılığı ve lockfile yok.
- **Neden:** İncelenen 38 skill + 19 araçtan hiçbiri üçünü birlikte yapmıyor: `.com.tr` doğru sorgu · "uzantı yok / kayda kapalı" ayrımı · emin değilken "boş" dememek.
  En yakın aday `saidutt46/domain-check` (Rust, brew kurulumu ister, kayda kapalı ayrımı yok).

## 2026-10-17 · rdap.org kullanılmaz

- **Kanıt:** `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/google.com.tr` → `404` (google.com.tr dolu).
  rdap.org 404'ünü "boş" sayan skill'ler dolu `.com.tr` adlarını boş gösteriyor.

## 2026-10-17 · .tr yalnız TRABİS WHOIS ile

- **Kanıt:** IANA `https://data.iana.org/rdap/dns.json` içinde `tr` yok.
  `whois -h whois.trabis.gov.tr <boş ad>` → `No match found for <ad>` · dolu ad → `** Domain Name:` · `zono.xyz.tr` → `Invalid input`.
- **techlookup'tan ayrılan nokta:** `techlookup/scripts/kimlik.mjs` `No match found`'u "ölçülemedi" sayar (site kimliği için doğru). Burada bu **BOS** demektir.

## 2026-10-17 · .data ve .search kayda kapalı listesinde

- **Kanıt 1 — zone doluluğu** (Cloudflare DoH, NS sorgusu, 15 yaygın kelime: big open my ai cloud web free home news shop app go one top best):
  `.data` 0/15 · `.search` 0/15 · karşılaştırma `.kim` 12/15.
- **Kanıt 2:** GoDaddy MCP `domains_check_availability` → `zono.data` "unavailable".
- **Kanıt 3:** `https://nic.search/` → `302 https://www.google.com/registry/` (kayıt sayfası yok).
- **Karşı kanıt (not edildi):** `whois.nic.data` → `Domain zono.data is available for registration`. Kayıt kurumu adı kayıtsız sayıyor, ama halka satış kanalı görülmedi.
- **Hüküm:** İkisi `liste/kapali-uzantilar.json` `elle` dizisine kanıt notuyla girer. ICANN spec13 (marka uzantısı) bayrağı ikisinde de `false`, bu yüzden otomatik listeye girmezler.

## 2026-10-17 · Premium tespiti GoDaddy MCP ile, .tr hariç

- **Kanıt:** `https://api.godaddy.com/v1/domains/mcp` `domains_check_availability`: `love.dev` → `inventoryType: Premium` · `zonokim.com` → `Standard` · `priceInfo: null`.
  `zonokim.com.tr` → "unavailable" ama TRABİS'e göre boş → GoDaddy .tr satmıyor.
- **Hüküm:** GoDaddy yalnız premium bayrağı verir, boş/dolu kararı asla vermez. `.tr` ailesi GoDaddy'ye hiç gönderilmez. Fiyat yok.
- **İstisna notu:** Bu adım adları bir kayıt firmasına gönderir; kullanıcı isteğiyle kabul edildi, `--premiumsuz` kapatır.
