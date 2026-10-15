# Test stratejisi Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Test katmanlarını ve hangi değişikliğin hangi testi gerektirdiğini tanımlar.

## 2. Kurallar

| Katman | Ne sınanır | Araç | Ne zaman |
|---|---|---|---|
| Statik | Tipler, lint, biçim | TypeScript, ESLint, Prettier | Editör, commit öncesi, CI |
| Birim | Alan mantığı: para, tarih, bakiye, bütçe, taksit, tekrar, ekstre, CSV ayrıştırma, kural eşleme | Vitest | Her kayıtta, saniyeler içinde |
| Entegrasyon | Eylem ve sorgular sarmalayıcılarıyla birlikte, gerçek PostgreSQL'de: yetki, kiracı yalıtımı, kurallar, eşzamanlılık, tekrar güvenliği, zamanlanmış işler | Vitest + Testcontainers | Her PR |
| Bileşen | Formlar ve ekran durumları kullanıcı gözünden | Vitest + Testing Library | Her PR |
| Uçtan uca | Demo senaryoları ve kritik akışlar, masaüstü ve telefon görünümünde | Playwright | PR'da Chromium; gece tüm tarayıcılar |
| Erişilebilirlik | Ana ekranlarda ciddi ve kritik ihlaller | `@axe-core/playwright` | Uçtan uca testlerle |
| Performans | NFR-20, NFR-21 | Tohumlanmış veriyle betik, Lighthouse CI | Haftalık ve faz sonu |

- Testlerin ağırlığı **entegrasyon** katmanındadır: hataların çoğu parçaların birleştiği yerde (eksik yetki, yanlış kapsam, işlem sınırı) çıkar. Hesaplama kuralları birim testleriyle, tablo biçiminde ve sınır değerleriyle sınanır.
- **Her yeni eylem için zorunlu testler:** başarılı yol; doğrulama hatası; başka defterin kaydıyla `notFound`; yetersiz rolle `forbidden`; güncellemede eski sürümle `conflict`; oluşturmada aynı `id` ile tekrar.
- **Kural izlenebilirliği:** test adı kural numarasıyla başlar. Bir betik `03-business-rules.md`'deki her kuralın en az bir testi olduğunu denetler: PR'da uyarı, sürümde hata.
- **Test verisi:** fabrika fonksiyonları (`makeLedger`, `makeTransaction`); her test kendi kullanıcısını ve defterini oluşturur, böylece testler paralel çalışır ve temizlik gerekmez.
- **Zaman:** saat sabitlenir; testler `TZ=Europe/Istanbul` ile çalışır, tarih testleri ayrıca UTC ile de çalıştırılır. Ay sonu, artık yıl, yıl dönümü ve gece yarısı sınırları her tarih kuralında sınanır.
- **Dış servisler:** e-posta testlerde belleğe yazılır; R2 için S3 uyumlu yerel kap (MinIO); Claude API kaydedilmiş yanıtlarla sahtelenir. Gerçek API yalnızca fiş okuma değerlendirme setinde, elle çalıştırılır.
- **Kararsız testler:** sabit süreli bekleme yasaktır; kararsız test bir iş günü içinde düzeltilir ya da issue açılarak karantinaya alınır.
- **Kapsam:** alan mantığında satır kapsamı en az %90; genel kapsam eşiği yoktur.
- **Hız hedefleri:** birim testleri 10 saniye, entegrasyon testleri 3 dakika, PR'daki uçtan uca testler 10 dakika altında.

## 3. Nasıl denetlenir

CI'daki test işleri; kapsam raporu; izlenebilirlik betiği.

## 4. Uygulamadaki durum

- Faz 1 sonunda: 57 birim, 34 entegrasyon, 2 uçtan uca senaryo (masaüstü ve telefon) ve axe taraması.
- Uçtan uca testler yerelde çalışan geliştirme sunucusunu kullanır; CI'da üretim derlemesine karşı çalışır.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
