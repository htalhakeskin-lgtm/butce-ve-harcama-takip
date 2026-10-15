# Sürekli entegrasyon ve yayın Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Sürekli entegrasyon ve yayın iş akışlarını tanımlar.

## 2. Kurallar

- **İş akışları:** `pr.yml` (her PR), `main.yml` (birleşmede yayın), `nightly.yml`, `weekly.yml` (performans, yedek), `release.yml` (release-please).
- **PR hattı:** kurulum (önbellekli) → tip denetimi, lint, biçim (paralel) → birim ve bileşen testleri → entegrasyon testleri (Testcontainers) → üretim derlemesi → derlenmiş uygulamaya karşı uçtan uca testler (Chromium, geçici PostgreSQL ile) → migration tutarlılığı (DT-02) → gitleaks → bağımlılık denetimi. Hedef süre 10 dakikanın altı.
- Uçtan uca testler Vercel önizlemesine değil, CI'da derlenen uygulamaya karşı çalışır; böylece sonuç önizleme ortamının durumuna bağlı olmaz. Vercel önizlemesi ve Neon dalı PR'ı elle denemek için ayrıca açılır.
- **Yayın hattı (`main`):** PR hattının tamamı → migration'ların üretim veritabanına uygulanması → Vercel üretim yayını → sağlık kontrolü. Vercel'in kendiliğinden üretime yayın yapması kapatılır; böylece migration'lar her zaman koddan önce uygulanır.
- **Gece:** tüm tarayıcılarda uçtan uca testler, Lighthouse CI, bağımlılık açığı taraması. **Haftalık:** performans testi; `pg_dump` ile şifreli yedeğin R2'ye yazılması (8 hafta saklama).
- **İş akışı güvenliği:** üçüncü taraf aksiyonlar commit SHA'sına sabitlenir; varsayılan `permissions: contents: read`; fork'tan gelen PR'lara gizli bilgi verilmez.
- **Yerelde aynı kontroller:** `pnpm check` komutu CI'daki kontrollerin uçtan uca testler dışındaki hepsini çalıştırır.

## 3. Nasıl denetlenir

Dal korumasında zorunlu kontrol listesi; başarısız gece işi e-posta uyarısı üretir.

## 4. Uygulamadaki durum

- İş akışları: `.github/workflows/pr.yml`, `deploy.yml`, `backup.yml`. Yayın ve yedek iş akışları gizli bilgiler tanımlanana kadar kendini atlar (A-06).
- Üçüncü taraf aksiyonlar şimdilik ana sürüm etiketiyle (`@v4`) kullanılıyor; depo GitHub'a alındığında commit SHA'larına sabitlenecek.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
