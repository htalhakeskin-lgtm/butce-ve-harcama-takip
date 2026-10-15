# İsimlendirme Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Kodda, veritabanında, adreslerde, çeviri anahtarlarında, ortam değişkenlerinde ve testlerde adların nasıl yazıldığını tanımlar.

## 2. Kurallar

- Kod adları İngilizcedir ve sözlükten türetilir. Sözlükte olmayan bir kavram koda girmeden önce sözlüğe eklenir.
- **Dönüşüm tablosu** (her kavram için tek satır): sözlük "İşlem kalemi" → tip `TransactionLine` → değişken `transactionLine` → tablo `transaction_lines` → yabancı anahtar `transaction_line_id` → çeviri anahtarı `transactions.line.*`.
- TypeScript: değişken ve fonksiyon `camelCase`; tip, arayüz ve React bileşeni `PascalCase`; modül düzeyindeki sabitler `SCREAMING_SNAKE_CASE`. Boolean adları `is`, `has`, `can`, `should` ile başlar. Olay işleyicisi `handleX`, bileşen özelliği `onX`.
- Eylemler fiil + nesne (`createTransaction`, `archiveAccount`); sorgular `getX` (tek) ve `listX` (çok). Zod şeması `createTransactionSchema`, tipi `CreateTransactionInput`.
- Dosya adları `kebab-case` (`transaction-form.tsx`); Next.js'in özel dosyaları (`page.tsx`, `layout.tsx`) kendi adlarıyla.
- Veritabanı: `snake_case`; tablolar çoğul; yabancı anahtar `{tekil}_id`. Sonekler: an `_at` (`timestamptz`), takvim günü `_on` (`date`), tutar `_minor` (`bigint`), yüzde `_percent`. Kısıt adları `pk_`, `fk_`, `ux_`, `ix_`, `ck_` önekli.
- Adresler İngilizce, `kebab-case`, kaynak adı çoğul (`/transactions`, `/settings/notifications`); dil öneki yoktur.
- Çeviri anahtarları `{modül}.{ekran veya bileşen}.{öğe}` (`budgets.card.remaining`); hata metinleri `errors.{kod}` (`errors.BR-TRX-004`).
- Ortam değişkenleri `SCREAMING_SNAKE_CASE`; tarayıcıya açılanlar `NEXT_PUBLIC_` önekli ve `env.ts`'te ayrı grupta.
- Test adları kural numarasıyla başlar: `BR-INS-002: distributes leftover cents to the first installment`.
- Kısaltma kullanılmaz (`txn`, `amt`, `cat` yok). İzinli kısaltmalar: `id`, `url`, `csv`, `pdf`, `ai`, `db`, `env`.

## 3. Nasıl denetlenir

ESLint `@typescript-eslint/naming-convention` ve yalnızca ASCII ad kuralı (`id-match`); veritabanı adları için şema testi; çeviri anahtarlarının biçimi için betik.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
