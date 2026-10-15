# Mimari Karar Kayıtları

| No | Konu | Karar |
|---|---|---|
| [ADR-0001](0001-uygulama-yapisi.md) | Uygulama yapısı | Next.js ile tek tam yığın uygulama; ayrı API sunucusu yok |
| [ADR-0002](0002-veritabani-ve-orm.md) | Veritabanı ve ORM | Neon PostgreSQL + Drizzle ORM |
| [ADR-0003](0003-kimlik-dogrulama.md) | Kimlik doğrulama | Better Auth; kimlik verisi kendi veritabanımızda |
| [ADR-0004](0004-kiraci-modeli.md) | Kiracı modeli | Defter (ledger) tabanlı kiracılık; yalıtım uygulama katmanında `scoped(ctx)` ve zorunlu testlerle. PostgreSQL satır düzeyi güvenliği (RLS) değerlendirildi ve şimdilik ertelendi: sunucusuz bağlantı havuzunda her isteğe kullanıcı bağlamı taşımak karmaşıklık katıyor; yeniden değerlendirme koşulu yazılır. |
| [ADR-0005](0005-tutar-tipi.md) | Tutar tipi | Kuruş cinsinden `bigint`; yuvarlama tek yardımcıda |
| [ADR-0006](0006-islem-kalemleri.md) | İşlem kalemleri | Her gelir/gider en az bir kalemle kategoriye bağlanır; bölünmüş işlem özel durum değildir |
| [ADR-0007](0007-sunucu-islemleri.md) | Sunucu işlemleri | Server Actions + `Result`; REST yalnızca dış tetikleyiciler için |
| [ADR-0008](0008-hesaplanan-degerler.md) | Hesaplanan değerler | Bakiye, bütçe ve ekstre saklanmaz, sorguyla hesaplanır |
| [ADR-0009](0009-taksit-modeli.md) | Taksit modeli | Taksitler oluşturma anında ileri tarihli işlemler olarak yazılır |
| [ADR-0010](0010-zamanlanmis-isler.md) | Zamanlanmış işler | Günlük Vercel Cron + kaçırılanları telafi + uygulama açılışında işleme; tüm işler idempotent |
| [ADR-0011](0011-dosya-depolama.md) | Dosya depolama | Cloudflare R2 özel kova, doğrudan imzalı yükleme |
| [ADR-0012](0012-fis-okuma.md) | Fiş okuma | Claude API, yapılandırılmış çıktı, öneri olarak kullanım, kullanıcı başına kota |
| [ADR-0013](0013-cok-dillilik.md) | Çok dillilik | next-intl, adreste dil öneki yok; dil kullanıcı ayarından |
| [ADR-0014](0014-next-js-onbellek-modeli.md) | Next.js önbellek modeli | Cache Components kapalı; oturuma bağlı sayfalar dinamik işlenir, yazmalardan sonra `revalidatePath` |
