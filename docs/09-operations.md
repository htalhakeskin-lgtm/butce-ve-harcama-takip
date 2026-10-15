# İşletim El Kitabı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## Yedekten geri yükleme

1. R2'deki `weekly/` klasöründen ilgili `butce-YYYY-MM-DD.dump.age` dosyasını indirin.
2. Özel anahtarla çözün: `age -d -i anahtar.txt dosya.dump.age > dosya.dump`.
3. Geri yüklemeyi **önce ayrı bir veritabanına** yapın: `pg_restore --no-owner --dbname "$HEDEF_URL" dosya.dump`.
4. Kayıt sayılarını ve son işlem tarihini üretimle karşılaştırın; doğruysa uygulamanın `DATABASE_URL`'ini bu veritabanına çevirin.

Neon'un zamana geri dönme özelliği (ücretsiz katmandaki geri dönüş penceresi kadar) küçük kazalarda önce denenir. Üç ayda bir geri yükleme tatbikatı yapılır ve sonucu bu belgenin değişiklik kaydına yazılır (NFR-17).

## Gizli bilgi döndürme

| Bilgi | Etkisi | Adımlar |
|---|---|---|
| `BETTER_AUTH_SECRET` | Tüm oturumlar kapanır | Yeni değeri Vercel'e girin, yeniden yayınlayın |
| `DATABASE_URL` | Kesinti olmaz | Neon'da yeni şifre üretin, Vercel ve GitHub gizli bilgisini güncelleyin, yeniden yayınlayın |
| `RESEND_API_KEY` | E-postalar kısa süre gönderilemez | Yeni anahtarı girin, eskisini Resend'de silin |
| `CRON_SECRET` | Faz 2'den itibaren | Vercel'de güncelleyin |

## Sorun giderme

- **Sağlık kontrolü 503 dönüyor:** veritabanına ulaşılamıyor. Neon durum sayfasına ve `DATABASE_URL`'e bakın.
- **E-postalar gelmiyor:** Resend panelinde gönderim kaydına bakın; alan adının SPF, DKIM ve DMARC kayıtlarını doğrulayın (R-05).
- **Ücretsiz katman sınırına yaklaşıldı:** Neon ve Vercel kullanım panellerine bakın; ücretli plana geçiş müşteri onayıyla yapılır (R-01).
- **Bir kullanıcı hata kimliği bildirdi:** Kimlik, sunucu loglarındaki `errorId` alanıdır; Vercel loglarında aratın.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
