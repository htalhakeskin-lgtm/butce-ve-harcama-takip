# Gözlemlenebilirlik Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Logları, hata izlemeyi, ölçümleri, sağlık kontrolünü ve uyarıları tanımlar.

## 2. Kurallar

- **Loglar:** yapılandırılmış JSON; seviyeler `debug`, `info`, `warn`, `error`; her istekte `requestId`; kullanıcı yalnızca kimliğiyle anılır. Loglara e-posta, tutar, açıklama, not, dosya içeriği, token ve şifre yazılmaz (BR-PRV-003).
- Vercel'in log saklama süresi kısa olduğu için kalıcı olması gereken olaylar loglarda değil tablolarda tutulur: zamanlanmış işler `job_runs`'ta, kayıt değişiklikleri `audit_events`'te, yönetici eylemleri yönetici günlüğünde.
- **Hatalar:** Sentry, kaynak eşlemeli. Gönderimden önce kişisel veri temizlenir. Kullanıcıya gösterilen hata kimliği Sentry olay kimliğidir; destek talebinde bu kimlikle arama yapılır.
- **Ölçümler:** Web Vitals için Vercel Speed Insights (çerezsiz). İş ölçümleri (kayıtlar, aktif kullanıcılar, fiş okuma sayısı ve maliyeti) yönetici panelinde.
- **Sağlık kontrolü:** `/api/health` uygulamayı ve veritabanını denetler; dış izleme servisi 5 dakikada bir çağırır.
- **Zamanlanmış işler:** her çalışma `job_runs`'a yazılır. Bir iş başarısız olursa veya 26 saattir başarıyla çalışmadıysa uyarı üretilir.
- **Uyarılar (e-posta):** yeni hata türü, hata oranında artış, sağlık kontrolü başarısız, zamanlanmış iş başarısız veya gecikmiş, yedek başarısız, aylık AI maliyeti eşiği aşıldı.

## 3. Nasıl denetlenir

Log yardımcısı yasak alanları kendiliğinden çıkarır (birim testi); uyarıların Faz 1 sonunda bir kez tetiklenerek denenmesi.

## 4. Uygulamadaki durum

- Sentry entegrasyonu, servis hesabı açılınca eklenecek (A-06). O zamana kadar beklenmeyen hatalar `errorId` ile yapılandırılmış JSON loga yazılır ve kullanıcıya aynı kimlik gösterilir.
- Sağlık kontrolü: `GET /api/health`.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
