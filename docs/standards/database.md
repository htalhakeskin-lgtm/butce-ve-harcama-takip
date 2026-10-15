# Veritabanı Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Kimlik, kolon tipleri, para, zaman, kiracılık, kısıtlar, indeksler, eşzamanlılık ve migration kurallarını tanımlar.

## 2. Kurallar

- PostgreSQL (Neon, Frankfurt). Uygulama havuzlu bağlantıyla, migration'lar doğrudan bağlantıyla çalışır.
- Kimlik: UUID v7, uygulamada üretilir.
- Ortak kolonlar: `id`, `created_at`, `updated_at`; kiracı tablolarında `ledger_id`; düzenlenebilen tablolarda `version`; gerekli yerlerde `created_by`, `updated_by`.
- Tutar: `bigint`, `_minor` sonekli, `CHECK (… > 0)`. Para birimi deftere aittir. Yuvarlama yalnızca `lib/money` ile yapılır; yöntem yarım değeri sıfırdan uzağa yuvarlamadır (PostgreSQL `round()` ile aynı sonuç). Taksit bölmede BR-INS-002 geçerlidir.
- Zaman: anlar `timestamptz` (UTC); takvim günü `date`; ay, ayın ilk günü olan bir `date` ve `CHECK (extract(day from …) = 1)`.
- Metin: `text` + uzunluk `CHECK`'i; uzunluklar iş kurallarından gelir.
- Sabit değer kümeleri PostgreSQL enum'u yerine `text` + `CHECK (… IN (…))` ile tutulur; değer eklemek tek satırlık migration'dır.
- Büyük/küçük harf duyarsız benzersizlik: uygulamada Türkçe kurallarla hesaplanan `name_key` kolonu ve üzerinde benzersiz indeks (PostgreSQL'in `lower()` fonksiyonu İ/ı dönüşümünü dile göre yapmaz).
- Tüm yabancı anahtarlar tanımlıdır ve `ON DELETE` davranışı tablo tablo yazılır: defter silinince alt kayıtlar `CASCADE`; kalemden kategoriye `RESTRICT`.
- İndeksler: kiracı tablolarındaki bileşik indeksler `ledger_id` ile başlar. İşlem listesi için `(ledger_id, occurred_on DESC, id DESC)`; bakiye için `(account_id, occurred_on)`; açıklama araması için `pg_trgm` GIN indeksi. Her yabancı anahtarın indeksi vardır.
- Yumuşak silme yalnızca `transactions`'ta vardır; sorgu yardımcıları `deleted_at IS NULL` koşulunu kendiliğinden ekler.
- Eşzamanlılık: `version` ile iyimser kilit. Birden çok tabloyu değiştiren yazmalar tek veritabanı işlemindedir. Zamanlanmış işlerin tekilliği benzersiz kısıtlarla sağlanır.
- Toplamalar SQL'de (`SUM`, `GROUP BY`) yapılır, uygulamada değil. N+1 sorgu yazılmaz. Listeler imleç tabanlıdır.
- Migration'lar `drizzle-kit generate` ile üretilir, SQL'i PR'da incelenir ve birleştikten sonra değiştirilmez. Geriye uyumsuz değişiklik genişlet / daralt yöntemiyle iki sürüme bölünür. Yayında önce migration, sonra kod.
- Başlangıç verisi: varsayılan kategoriler kodda tanımlıdır ve kayıtta oluşturulur; migration'a gömülmez. Demo verisi bir üretici fonksiyonla oluşturulur.

## 3. Nasıl denetlenir

DT-01 tüm migration'lar boş veritabanına sırayla uygulanır; DT-02 Drizzle şeması ile migration'lar arasında fark yoktur; DT-03 `ledger_id`'si olmayan kiracı tablosu yoktur; DT-04 her yabancı anahtarın indeksi vardır; DT-05 kısıt ihlali doğru kural koduna eşlenir.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
