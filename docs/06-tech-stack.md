# Teknoloji Seçimleri

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## Seçimler

Sürümler Faz 0'da güncel kararlı sürümlere sabitlenir ve `docs/06-tech-stack.md`'ye yazılır.

| Katman | Seçim | Neden | Değerlendirilen alternatif |
|---|---|---|---|
| Dil | TypeScript (katı mod) | Ön yüz, sunucu ve doğrulama şemaları tek dilde; tipler uçtan uca taşınır. | — |
| Çatı | Next.js (App Router, React Server Components) | Tek kod tabanında hem arayüz hem sunucu. Vercel'de ek ayar gerektirmeden yayınlanır. Okuma işlemleri sunucu bileşenlerinde yapıldığı için ayrı API katmanı yazılmaz. | Vite SPA + ayrı API: iki dağıtım, iki hosting. |
| Sunucu işlemleri | Server Actions + tek tip sonuç (`Result`) | Formdan veritabanına tip güvenli yol; ayrı REST katmanı gerekmez. REST yalnızca dış tetikleyiciler için ([§6.3](07-architecture.md#katmanlar-ve-istek-akışı)). | tRPC: ek bağımlılık, Server Actions ile aynı işi görür. |
| Veritabanı | PostgreSQL (Neon, ücretsiz katman, Frankfurt bölgesi) | Standart PostgreSQL olduğu için taşınabilir. Kullanılmadığında kendiliğinden küçülür ama proje askıya alınmaz. Her PR için ayrı veritabanı dalı açılabilir. | Supabase: 7 gün hareketsizlikte duraklar, platforma bağımlılık. |
| ORM ve migration | Drizzle ORM + drizzle-kit | SQL'e yakın ve tipli; sunucusuz ortamda hafif; migration'lar SQL dosyası olarak incelenebilir. | Prisma: daha ağır istemci, sunucusuzda soğuk başlangıç. |
| Kimlik doğrulama | Better Auth | E-posta/şifre, e-posta doğrulama, şifre sıfırlama, iki adımlı doğrulama, Google, oturum listesi, yönetici ve hız sınırı tek kütüphanede. Veri kendi veritabanımızda durur. | Auth.js: Better Auth ile birleşti. Clerk: ücretli kademeler, veri dışarıda. |
| Arayüz | React, Tailwind CSS, shadcn/ui (Radix), lucide simgeleri | Hazır bileşenler erişilebilir. Kodları projede durduğu için tamamen özelleştirilebilir. Karanlık mod tasarım değişkenleriyle kurulur. | MUI: ağır, "hazır şablon" görünümü. |
| Formlar ve doğrulama | React Hook Form + Zod | Aynı Zod şeması hem formda hem sunucuda çalışır. | — |
| Grafikler | Recharts (shadcn/ui chart bileşenleri) | Tasarım değişkenleriyle uyumlu, erişilebilir, yeterli grafik türü. | Chart.js: canvas tabanlı, tema entegrasyonu zayıf. |
| Tablolar | TanStack Table | Sıralama, sütun yönetimi, sanal kaydırma. | — |
| Adres durumu | nuqs | Filtreler adreste durur; geri tuşu ve paylaşılan bağlantı çalışır. | — |
| Tarih | date-fns (+ saat dilimi desteği) | Yalnızca kullanılan fonksiyonlar pakete girer; Türkçe yerel ayarı var. | — |
| Çok dillilik | next-intl (adres öneki olmadan) | Sunucu ve istemci bileşenlerinde aynı API; dil kullanıcı ayarından gelir (K-10). | — |
| E-posta | Resend + React Email | Ücretsiz katman yeterli; şablonlar önizlenebilen React bileşenleri. Alan adı doğrulaması gerekir (A-01). | Brevo: alan adı olmadan gönderebilir ama teslim oranı düşük. |
| Dosya depolama | Cloudflare R2 (özel kova, süreli imzalı adres) | Ücretsiz katmanı geniş, çıkış trafiği ücretsiz, S3 uyumlu. Fişler herkese açık olmamalı. | Vercel Blob: daha kolay kurulum; özel erişim ve ücretsiz kota daha sınırlı. |
| AI (fiş okuma) | Claude API, `@anthropic-ai/sdk`, varsayılan model `claude-opus-5-5` | Görsel ve PDF girdisi; Zod şemasıyla doğrulanan yapılandırılmış çıktı. Ayrıntı: [§6.6](06-tech-stack.md#fiş-okuma-ai). | — |
| PDF rapor | @react-pdf/renderer | Sunucuda React bileşeninden PDF; Türkçe karakterli yazı tipi gömülebilir. | Tarayıcıda yazdırma: düzen tutarsız. |
| Excel | ExcelJS | Biçimli hücre, para biçimi, birden çok sayfa. | — |
| CSV | Papa Parse | Tarayıcıda akışlı ayrıştırma ve önizleme. | — |
| PWA | Next.js manifest + Serwist | Ana ekrana ekleme ve kabuk önbelleği; veri çevrimdışı tutulmaz. | — |
| Zamanlanmış işler | Vercel Cron (günde bir) + kaçırılanları yakalayan tasarım | Ücretsiz katmanda günlük iş yeterli; işler idempotent (K-09). | GitHub Actions zamanlayıcısı: yedek olarak. |
| Hata izleme | Sentry (ücretsiz katman) | İstemci ve sunucu hataları, kaynak eşlemeli yığın izi. | — |
| Test | Vitest, Testing Library, Testcontainers (PostgreSQL), Playwright, axe-core | Entegrasyon testleri gerçek PostgreSQL ile, uçtan uca testler gerçek tarayıcıda çalışır; erişilebilirlik taraması otomatik. | PGlite: hızlı ama birebir PostgreSQL değil. |
| Kod kalitesi | ESLint (typescript-eslint, katı), Prettier | — | Biome: Next.js ve React kurallarında eksik. |
| Paket yöneticisi | pnpm | Hızlı, katı bağımlılık çözümü. | — |
| CI/CD | GitHub Actions + Vercel Git entegrasyonu | Her PR'da önizleme ortamı; `main` birleşince yayın. | — |

## Kurulu sürümler (Faz 0)

| Paket | Sürüm | Not |
|---|---|---|
| Next.js | 16.4.0 | 16.4.1, pnpm'in 24 saatlik yayın bekleme politikasına takıldığı için bir önceki sürüm |
| React | 19.3.0 | aynı nedenle |
| TypeScript | 6.0.3 | 7.x typescript-eslint ile henüz uyumlu değil |
| Better Auth | 1.7.7 | |
| Drizzle ORM / Kit | 0.45.4 / 0.31.11 | |
| Tailwind CSS | 4.3 | |
| Vitest / Playwright | 5.0 / 1.64.0 | |
| PostgreSQL | 17 (yerel: Docker, üretim: Neon) | |

## Fiş okuma (AI)

| Konu | Karar |
|---|---|
| SDK | `@anthropic-ai/sdk` (resmi TypeScript SDK). Ham HTTP çağrısı yazılmaz. |
| Model | `claude-opus-5-5`. Daha ucuz bir model (ör. `claude-haiku-5-5`) ancak örnek fişlerden oluşan bir değerlendirme setinde doğruluğu ölçüldükten sonra seçilir (açık konu A-04). |
| Girdi | Görsel (`image` bloğu: JPEG, PNG, WebP; HEIC sunucuda JPEG'e çevrilir) veya PDF (`document` bloğu). Görsel gönderilmeden önce küçültülür ve EXIF bilgisi silinir. |
| Çıktı | Yapılandırılmış çıktı (`output_config.format`), Zod şemasıyla doğrulanır (`client.messages.parse` + `zodOutputFormat`). Alanlar: işyeri, tarih, toplam tutar, para birimi, kalemler (isteğe bağlı), defterin kategori listesinden önerilen kategori, güven düzeyi. |
| Düşünme ve çaba | Bu modelde düşünme kapatılamaz; derinlik `output_config.effort` ile ayarlanır. Başlangıç `medium`; değerlendirme setinde `low` yeterli çıkarsa ona inilir. |
| Ret | `stop_reason === "refusal"` kontrol edilir; kullanıcıya "Fiş okunamadı, bilgileri elle girin" gösterilir. Sunucu taraflı yedek model (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) açılır. |
| Hata | Kısa zaman aşımı; hız sınırı ve 5xx hatalarında SDK'nın kendi yeniden denemesi. Başarısızlıkta işlem elle girilir, fiş ek olarak kalır. |
| Gizlilik | Fiş yalnızca okuma için gönderilir. Bu bilgi ilk kullanımda ve aydınlatma metninde yazılır. Kullanıcı özelliği ayarlardan kapatabilir. |
| Maliyet kaydı | Her okumanın girdi ve çıktı token sayısı `receipt_scans` tablosunda tutulur; yönetici panelinde aylık toplam görünür. |

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
