# Yapılandırma Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Ortamları, ortam değişkenlerini, iş parametrelerini ve dış servis çağrılarını tanımlar.

## 2. Kurallar

- **Ortamlar:** yerel (Docker'da PostgreSQL veya Neon geliştirme dalı), önizleme (PR başına Vercel + Neon dalı), üretim. Demo, üretim ortamının içindedir.
- **Bölge:** tüm servisler AB'de: Vercel fonksiyon bölgesi `fra1`, Neon Frankfurt, R2 AB yetki alanı (KVKK, gecikme).
- **Ortam değişkenleri:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`, `BACKUP_PUBLIC_KEY`. Her biri için: ne işe yarar, hangi ortamda zorunlu, nereden alınır.
- **Doğrulama:** `src/env.ts`'te Zod şeması; eksik veya hatalı değişken derlemeyi durdurur. `.env.example` her değişiklikte güncellenir.
- **İsteğe bağlı özellikler:** Google girişi ve fiş okuma, anahtarları tanımlı değilse arayüzde görünmez. Ayrı bir özellik bayrağı servisi kullanılmaz.
- **İş parametreleri:** sabit sınırlar (çöp kutusu 30 gün, içe aktarma 5 MB / 5.000 satır, ek 10 MB, bildirim saklama 90 gün…) tek bir dosyada (`src/config/limits.ts`), ilgili kural numarasıyla birlikte durur.
- **Yönetici ayarları:** kayıt modu, AI kotası, AI açık/kapalı, demo açık/kapalı `app_settings` tablosundadır ve yönetici panelinden değişir.
- **Dış servis çağrıları:** her servis için zaman aşımı, yeniden deneme ve hata durumundaki davranış tablosu. Örnek: Resend başarısızsa bildirim uygulama içinde kalır ve e-posta sonraki çalışmada yeniden denenir; sızmış şifre servisi yanıt vermezse kayıt engellenmez ve durum loglanır.

## 3. Nasıl denetlenir

Ortam doğrulaması derlemede; `.env.example` ile `env.ts`'in eşleştiğini denetleyen betik.

## 4. Uygulamadaki durum

Uygulanan ortam değişkenleri: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `EMAIL_TRANSPORT` (`file` / `resend`), `EMAIL_FROM`, `RESEND_API_KEY`, `CRON_SECRET`. Yalnızca test ortamında kullanılan anahtarlar: `AUTH_RATE_LIMIT=off`, `PASSWORD_BREACH_CHECK=off`. Doğrulama `src/env.ts`'tedir; örnek değerler `.env.example`'dadır.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
