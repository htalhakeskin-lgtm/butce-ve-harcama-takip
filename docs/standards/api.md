# Sunucu işlemleri ve HTTP uç noktaları Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Sunucu eylemlerinin sözleşmesini, hata kodlarını, sarmalayıcıları ve HTTP uç noktalarını tanımlar.

## 2. Kurallar

- **Eylem sözleşmesi:** girdi, modülün `schemas.ts` dosyasındaki Zod şemasıdır ve istemciyle paylaşılır. Çıktı `Result<T>`: `{ ok: true, data }` veya `{ ok: false, error: { code, params?, fieldErrors? } }`.
- **Hata kodları:** iş kuralı ihlalinde kural numarası (`BR-TRX-004`); teknik hatalarda `validation`, `unauthenticated`, `forbidden`, `notFound`, `conflict`, `rateLimited`, `quotaExceeded`, `unexpected`. Sunucu kullanıcıya gösterilecek metin üretmez; metin çeviri dosyasındadır ve `params` ile doldurulur.
- **Sarmalayıcılar:** her eylem şunlardan biriyle tanımlanır: `publicAction`, `authAction`, `ledgerAction({ minRole })`, `adminAction`. Sarmalayıcısız eylem yazılmaz.
- Başka bir defterin kaydına yapılan istek `notFound` döner (BR-SYS-001).
- **Tekrar güvenliği:** oluşturma eylemleri istemcinin ürettiği `id`'yi alır; aynı `id` ikinci kez gelirse yeni kayıt oluşmaz, mevcut kayıt döner.
- **Eşzamanlılık:** güncelleme ve silme `version` alır; uyuşmazlıkta `conflict` ve kaydın güncel hali döner.
- **Önbellek:** okumalar `ledger:{id}:{kaynak}` biçiminde etiketlenir; eylemler değiştirdikleri kaynakların etiketlerini geçersiz kılar.
- **Listeler:** imleç tabanlı sayfalama (`occurred_on`, `id`), sayfa boyutu 50. Filtre ve sıralama adres parametrelerindedir ve Zod ile ayrıştırılır.
- **Route Handler'lar** yalnızca şunlar içindir: `/api/auth/*` (Better Auth), `/api/cron/*` (`Authorization: Bearer CRON_SECRET`), `/api/uploads/*` (imzalı adres), `/api/exports/*` (dosya indirme), `/api/health`. Hata gövdesi eylemlerle aynı `error` nesnesidir; HTTP durum kodları eşleme tablosuyla verilir.
- **Hız sınırları:** giriş, kayıt, şifre sıfırlama, doğrulama e-postası, fiş okuma, dışa aktarma ve içe aktarma için ayrı sınırlar; değerler tabloda.
- **Dosya yükleme:** tarayıcı dosyayı imzalı adresle doğrudan R2'ye yükler (Vercel'in istek gövdesi sınırına takılmaz); ardından `confirmUpload` eylemi dosyanın türünü ve boyutunu doğrular.
- **Yayın uyumluluğu:** yeni yayından sonra eski sekmede açık kalan form bulunamayan bir eylemi çağırırsa "Uygulama güncellendi, sayfayı yenileyin" gösterilir. Eylem girdilerine alan eklemek serbesttir; alan kaldırmak iki yayına bölünür.

## 3. Nasıl denetlenir

Her eylem için zorunlu entegrasyon testi seti ([testing](#testingmd--test-stratejisi)); sarmalayıcısız eylem olmadığını denetleyen mimari test.

## 4. Uygulamadaki durum

- Faz 1'de yalnızca `ledgerAction` sarmalayıcısı vardır; kimlik işlemleri Better Auth uç noktalarından geçer. `adminAction` Faz 5'te eklenecek.
- Okuma eylemleri `readOnly: true` ile işaretlenir ve önbelleği yenilemez.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
