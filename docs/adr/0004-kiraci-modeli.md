# ADR-0004: Kiracı modeli

> **Durum:** Kabul edildi · **Tarih:** 2026-10-15

## Karar

Defter (ledger) tabanlı kiracılık; yalıtım uygulama katmanında `scoped(ctx)` ve zorunlu testlerle. PostgreSQL satır düzeyi güvenliği (RLS) değerlendirildi ve şimdilik ertelendi: sunucusuz bağlantı havuzunda her isteğe kullanıcı bağlamı taşımak karmaşıklık katıyor; yeniden değerlendirme koşulu yazılır.

## Bağlam ve gerekçe

Ayrıntılı gerekçe ve değerlendirilen alternatifler: [Teknoloji seçimleri](../06-tech-stack.md), [Kararlar](../00-scope.md#kararlar).

## Sonuçlar

Bu kararı değiştiren bir değişiklik yeni bir ADR ile yapılır; bu kayıt "Yerini aldı: ADR-xxxx" olarak işaretlenir.
