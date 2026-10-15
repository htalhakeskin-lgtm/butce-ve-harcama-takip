# Güvenlik Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Yetki modelini, kimlik doğrulamayı, gizli bilgileri, tarayıcı başlıklarını, girdi doğrulamayı ve KVKK kurallarını tanımlar.

## 2. Kurallar

- **İlkeler:** her denetim sunucudadır; en az yetki; katmanlı savunma; güvenli varsayılan (yeni eylem sarmalayıcısız yazılamaz); gizli bilgi depoda olmaz.
- **Yetki modeli:** sistem rolü (`user`, `admin`) ve defter rolü (`owner`, `editor`, `viewer`). [§5.2](05-screens.md)'deki tablo kodda tek dosyada (`permissions.ts`) tanımlıdır; hem sarmalayıcı hem arayüz bu dosyayı kullanır.
- **Kimlik doğrulama:** Better Auth. Şifre politikası BR-AUTH-001; özetleme algoritması kütüphanenin varsayılanı (scrypt). Oturum çerezi `HttpOnly`, `Secure`, `SameSite=Lax`, `__Secure-` önekli. Oturum süresi ve hassas işlemlerde şifrenin yeniden istenmesi BR-AUTH-006. Kullanıcı numaralandırma engeli BR-AUTH-003.
- **İki adımlı doğrulama** isteğe bağlıdır, ama yönetici hesaplarında zorunludur (Faz 5).
- **Gizli bilgiler:** yalnızca Vercel ortam değişkenlerinde ve yerelde git'e girmeyen `.env.local`'de. Depoda gitleaks taraması (commit öncesi ve CI) ve GitHub push koruması. Döndürme prosedürü işletim el kitabındadır (ör. `BETTER_AUTH_SECRET` değişirse tüm oturumlar kapanır).
- **Tarayıcı başlıkları:** nonce tabanlı CSP (`script-src 'nonce-…' 'strict-dynamic'`; `img-src`'de yalnızca R2 alan adı; `connect-src`'de Sentry), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, kısıtlı `Permissions-Policy` (kamera yalnızca kendi kaynağımız), `frame-ancestors 'none'`.
- **Girdi doğrulama katmanları:** istemcide Zod (kolaylık) → sunucuda aynı Zod şeması (zorunlu) → iş kuralları → veritabanı kısıtları.
- **Çıktı güvenliği:** React'in kaçışlamasına güvenilir; `dangerouslySetInnerHTML` yasak. CSV ve Excel dışa aktarmada `=`, `+`, `-`, `@`, sekme ve satır başı ile başlayan hücreler kaçışlanır (formül enjeksiyonu).
- **Dosyalar:** tür içerikten denetlenir; boyut sınırı; depolama anahtarı UUID'dir, kullanıcının dosya adı anahtara girmez; kova herkese kapalı; imzalı adres 5 dakika; EXIF silinir.
- **AI:** fiş içeriği güvenilmeyen girdidir. Modelin çıktısı yalnızca şemaya uyan veri olarak kullanılır, hiçbir zaman komut olarak yorumlanmaz; kullanıcı onayı olmadan hiçbir kayıt oluşmaz.
- **Kişisel veri ve KVKK:** hangi verinin neden, nerede (AB) ve ne kadar süre tutulduğu tablosu; alt işleyenler listesi (Vercel, Neon, Resend, Cloudflare, Anthropic, Sentry); aydınlatma metninin sürümlenmesi; veri indirme ve silme. Yalnızca zorunlu çerezler kullanılır; bu yüzden çerez onay penceresi değil, bilgilendirme sayfası vardır.
- **Bağımlılıklar:** kilit dosyası zorunlu; pnpm'in kurulum betiklerini varsayılan olarak çalıştırmama davranışı korunur, izin verilen paketler listede açıkça yazılır; Dependabot ve `pnpm audit`.

## 3. Nasıl denetlenir

Kiracı yalıtımı testleri (her eylem ve sorgu), rol matrisi testleri, güvenlik başlığı testi, gizli bilgi taraması, Faz 7'de OWASP ASVS kontrol listesi.

## 4. Uygulamadaki durum

- CSP: `script-src` istek başına nonce ve `strict-dynamic` ile kısıtlıdır (`src/proxy.ts`). Grafikler ve ilerleme çubukları `style` niteliği kullandığı için `style-src 'unsafe-inline'` bilinçli olarak açıktır; betikler korunur.
- Sızmış şifre kontrolü Better Auth eklentisiyle değil kendi kodumuzla yapılır, çünkü eklenti servis yanıt vermezse kaydı engelliyordu (bu standardın 'engellemez' kuralına aykırı).
- Hız sınırı IP ve yol bazındadır. BR-AUTH-005'teki e-posta bazlı 15 dakikalık bekletme Faz 5'te (hesap güvenliği) eklenecek.
- Yönetici hesaplarında iki adımlı doğrulama zorunluluğu Faz 5 ile gelir.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
