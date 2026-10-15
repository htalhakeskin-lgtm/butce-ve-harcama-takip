# Kod stili ve statik analiz Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

TypeScript ayarlarını, biçimi, lint kurallarını ve React/Next.js yazım kurallarını tanımlar.

## 2. Kurallar

- TypeScript `strict` açık; ek olarak `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. `any` yasak; dış veri `unknown` olarak alınır ve Zod ile daraltılır. `enum` yerine `as const` nesneler ve birleşim tipleri.
- Prettier varsayılan ayarlarla, yalnızca `printWidth: 100`; Tailwind sınıf sıralama eklentisi. Markdown dosyaları Prettier dışında.
- ESLint: `typescript-eslint` (`strictTypeChecked`, `stylisticTypeChecked`), `@next/eslint-plugin-next`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-boundaries` (modüller yalnızca birbirinin `index.ts`'inden içe aktarır), `simple-import-sort`, kural kapatma yorumları için `eslint-comments`.
- **Projeye özgü yasaklar** (ESLint ile):
  - Tutarı `Number()`, `parseFloat()` ile ayrıştırmak; `lib/money`'deki `parseMoney` kullanılır.
  - Alan mantığında `new Date()` ve `Date.now()`; "bugün" parametre olarak gelir (test edilebilirlik).
  - `Date` nesnesiyle ay aritmetiği; `lib/dates` kullanılır (ay sonu kuralı tek yerde).
  - Argümansız `toLocaleLowerCase()`, `toLocaleUpperCase()`, `localeCompare()`; dil her zaman verilir (Türkçe İ/ı).
  - `console.log`; loglayıcı kullanılır.
  - `dangerouslySetInnerHTML`.
  - Sunucu modülü dışında veritabanı içe aktarımı; kiracı tablosuna `scoped(ctx)` dışından erişim.
- React ve Next.js: bileşenler varsayılan olarak sunucu bileşenidir; `"use client"` ağacın en küçük yaprağına konur. Sunucu modülleri `import "server-only"` içerir. Veri sunucuda okunur; istemcide `useEffect` ile veri çekilmez. Liste `key`'i olarak dizi indeksi kullanılmaz.
- Hata yönetimi: eylemler fırlatmaz, `Result` döner. Beklenmeyen hatalar yakalanır, Sentry'ye gönderilir, kullanıcıya genel mesaj ve hata kimliği gösterilir.
- Varsayılan dışa aktarım yalnızca Next.js'in istediği dosyalarda.
- Yorumlar "ne"yi değil "neden"i anlatır. `TODO` yalnızca issue numarasıyla yazılır.
- Kuraldan sapma tek satırla sınırlıdır (`eslint-disable-next-line kural -- gerekçe`); gerekçesiz kapatma lint hatasıdır.

## 3. Nasıl denetlenir

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`; commit öncesinde değişen dosyalarda, CI'da tüm depoda.

## 4. Uygulamadaki durum

- Prettier satır uzunluğu **120** olarak uygulandı (plan 100 diyordu): Tailwind sınıf listeleriyle 100 karakter çok sık satır kırdırıyordu.
- `jsx-a11y/no-autofocus` kapalı: iletişim kutuları ve tek amaçlı formlar ilk alana odaklanır (WAI-ARIA dialog deseni).
- React Hook Form'da `watch()` yerine `useWatch()` kullanılır (React Compiler uyumu).

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
