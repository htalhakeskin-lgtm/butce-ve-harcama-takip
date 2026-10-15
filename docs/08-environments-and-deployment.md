# Ortamlar ve Yayın

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## Ortamlar

| Ortam | Veritabanı | E-posta | Adres |
|---|---|---|---|
| Yerel | Docker'da PostgreSQL 17 (`docker compose up -d`, port 5433) | Dosyaya yazılır (`.dev-mail/`, `/dev/mail`) | http://localhost:3000 |
| Önizleme | PR başına Neon dalı | Resend (test alanı) | Vercel önizleme adresi |
| Üretim | Neon (Frankfurt) | Resend (müşterinin alan adı) | Müşterinin alan adı (A-01) |

Servis hesapları müşteri adına açılacaktır ve henüz açılmamıştır (A-06, K-18). Uygulama tüm bilgileri ortam değişkenlerinden okur; hesaplar açıldığında kod değişmez.

## Yayın akışı

1. PR birleşir; `PR` iş akışı `main` üzerinde yeşil olur.
2. `Deploy` iş akışı önce `pnpm db:migrate` ile migration'ları üretim veritabanına uygular.
3. Ardından Vercel CLI ile üretim derlemesi yayına alınır (Vercel'in `main` dalında kendiliğinden yayını `vercel.json`'da kapalıdır).
4. `/api/health` yeşil dönene kadar kontrol edilir.

Gerekli GitHub gizli bilgileri iş akışı dosyasının başında listelidir. Gizli bilgiler tanımlanmadıkça iş akışı kendini atlar.

## Maliyet

Ücretsiz katman sınırlarını sağlayıcılar değiştirebilir. Faz 0'da güncel sınırlar doğrulanır ve tarihiyle `docs/08-environments-and-deployment.md`'ye yazılır.

| Servis | Kullanım | Beklenen maliyet |
|---|---|---|
| Vercel (Hobby) | Uygulama, önizleme ortamları, günlük cron | Ücretsiz. Hobby planı kişisel ve ticari olmayan kullanım içindir; uygulama ticarileşirse Pro plana geçilir (R-02). |
| Neon (Free) | PostgreSQL, PR başına veritabanı dalı | Ücretsiz |
| Resend (Free) | Doğrulama, sıfırlama ve bildirim e-postaları | Ücretsiz; alan adı gerekir |
| Cloudflare R2 | Fiş ve fatura dosyaları | Ücretsiz katman içinde |
| Sentry (Developer) | Hata izleme | Ücretsiz |
| Anthropic API | Fiş okuma | Kullanım başına; kullanıcı başına aylık kota ile sınırlı (BR-RCP-004) |
| Alan adı | E-posta gönderimi ve uygulama adresi | Yıllık düşük bir ücret |
| Uptime izleme (UptimeRobot veya Better Stack) | Sağlık kontrolü | Ücretsiz |

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
