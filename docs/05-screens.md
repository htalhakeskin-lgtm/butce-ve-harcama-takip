# Ekranlar, Roller ve Gezinme

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## Kullanıcılar ve roller

## 5.1 Kişiler

| Kişi | Kim | Ne ister | Başlıca cihaz |
|---|---|---|---|
| **P-1 Bireysel kullanıcı** | Müşterinin kendisi ve kayıt olan herkes | Harcamalarını hızlıca girmek, ay sonunu görmek, paranın nereye gittiğini anlamak | Telefon (giriş), bilgisayar (rapor, içe aktarma) |
| **P-2 Ortak defter üyesi** | Eş, aile bireyi | Ortak giderleri birlikte girmek, ortak bütçeyi görmek | Telefon |
| **P-3 Yönetici** | Müşteri (işletmeci rolüyle) | Kaydı açıp kapatmak, davet göndermek, kötüye kullanımı engellemek, sistem sağlığını görmek | Bilgisayar |
| **P-4 Ziyaretçi** | Giriş yapmamış kişi | Uygulamayı tanımak, demo hesabıyla denemek | Her ikisi |

## 5.2 Roller ve yetkiler

İki ayrı eksen vardır: **sistem rolü** (kullanıcı / yönetici) ve **defter rolü** (sahip / düzenleyici / görüntüleyici). Yönetici olmak hiçbir deftere erişim vermez (BR-ADM-001).

| İşlem | Sahip | Düzenleyici | Görüntüleyici |
|---|:-:|:-:|:-:|
| Dashboard, işlemler, raporlar görme | ✔ | ✔ | ✔ |
| İşlem ekleme, düzenleme, silme | ✔ | ✔ | — |
| Hesap, kategori, etiket, bütçe, hedef, tekrarlayan kural yönetimi | ✔ | ✔ | — |
| İçe aktarma | ✔ | ✔ | — |
| Dışa aktarma | ✔ | ✔ | ✔ |
| İşlem geçmişini görme | ✔ | ✔ | ✔ |
| Üye davet etme, rol değiştirme, üye çıkarma | ✔ | — | — |
| Defter adını ve para birimini değiştirme, defteri silme | ✔ | — | — |

Kişisel defterde tek üye vardır ve o üye sahiptir. Rol arayüzü Faz 6'ya kadar görünmez, ama yetki denetimi Faz 1'den beri bu tabloya göre çalışır (K-06).

## Ekranlar ve gezinme

Ekran çizimleri ve şablonlar Faz 0'da `docs/05-screens.md`'de hazırlanır. Burada ekranların listesi ve gezinme yapısı vardır.

## 12.1 Gezinme

| Cihaz | Yapı |
|---|---|
| Masaüstü (≥ 1024 px) | **Sol kenar çubuğu:** Özet, İşlemler, Hesaplar, Bütçe, Raporlar, Hedefler, Tekrarlayanlar; ayraçtan sonra Kategoriler, İçe aktar, Çöp kutusu, Ayarlar. Daraltılabilir. **Üst çubuk:** defter değiştirici (Faz 6), "İşlem ekle" düğmesi, bildirim zili (Faz 4), kullanıcı menüsü. |
| Tablet (640–1023 px) | Kenar çubuğu yalnızca simgelerle; üzerine gelince veya dokununca etiket. |
| Telefon (< 640 px) | **Alt çubuk (5 öğe):** Özet, İşlemler, **+** (ortada, büyük), Raporlar, Menü. Diğer ekranlar "Menü"dedir. Üst çubukta ekran başlığı, defter değiştirici ve zil. Formlar tam ekran açılır, kaydet düğmesi altta sabittir. |

Masaüstünde klavye kısayolları: `N` yeni işlem, `/` arama, `G` sonra `D` / `T` / `R` ile Özet / İşlemler / Raporlar. `?` kısayol listesini gösterir.

## 12.2 Ekran listesi

| Ekran | Adres | Faz |
|---|---|---|
| Giriş, kayıt, e-posta doğrulama, şifremi unuttum, şifre sıfırlama | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | 1 |
| Yasal metinler | `/legal/privacy`, `/legal/terms`, `/legal/cookies` | 1 |
| Davet kabul | `/invite/[token]` | 6 |
| Hoş geldin akışı | `/welcome` | 2 |
| Özet (dashboard) | `/dashboard` | 1 |
| İşlemler (liste + filtre) | `/transactions` | 1 |
| İşlem detayı ve düzenleme | `/transactions/[id]` (masaüstünde yan panel, telefonda tam ekran) | 1 |
| Hesaplar ve hesap detayı (kredi kartında ekstre) | `/accounts`, `/accounts/[id]` | 1 (ekstre: 2) |
| Kategoriler | `/categories` | 1 |
| Bütçe | `/budgets` | 1 |
| Raporlar | `/reports` (sekmeler: özet, yıllık, trend, karşılaştırma, hesaplar) | 1 (sekmeler: 4) |
| Tekrarlayanlar ve onay bekleyenler | `/recurring` | 2 |
| Taksit planı detayı | `/installments/[id]` | 2 |
| Çöp kutusu | `/trash` | 2 |
| İçe aktar ve içe aktarma geçmişi | `/import` | 3 |
| Hedefler | `/goals` | 4 |
| Bildirimler | `/notifications` (+ zil açılır menüsü) | 4 |
| Ayarlar: profil, güvenlik, oturumlar, bildirimler, görünüm, defterler ve üyeler, kategori kuralları, verilerim | `/settings/*` | 1–6 |
| Yönetim: kullanıcılar, ayarlar, sistem durumu | `/admin/*` | 5 |
| Demo girişi | `/demo` | 5 |

## 12.3 Özet ekranının yerleşimi

```
Telefon (390 px)                         Masaüstü (1440 px)
┌──────────────────────────┐             ┌────────┬──────────────────────────────────────────────┐
│ Özet        Ekim 2026 ▾ ◎│             │ Kenar  │ Özet                    ◂ Ekim 2026 ▸   + İşlem │
├────────────┬─────────────┤             │ çubuğu ├───────────┬───────────┬───────────┬──────────┤
│ Toplam     │ Kalan bütçe │             │        │ Toplam    │ Gelir     │ Gider     │ Kalan    │
│ bakiye     │ ▓▓▓▓▓░░ 62% │             │        │ bakiye    │           │           │ bütçe    │
├────────────┼─────────────┤             │        ├───────────┴───────────┼───────────┴──────────┤
│ Gelir      │ Gider       │             │        │ Gelir-gider (6 ay)    │ Bütçe: kategoriler   │
├────────────┴─────────────┤             │        │ ▇▅ ▇▆ ▇▇ ▇▅ ▇▆ ▇▃      │ Market    ▓▓▓▓▓░ 82% │
│ Yaklaşan ödemeler (F2)   │             │        │                       │ Ulaşım    ▓▓▓░░░ 54% │
├──────────────────────────┤             │        ├───────────────────────┼──────────────────────┤
│ Bütçe: kategoriler       │             │        │ Hesaplar              │ Son işlemler         │
├──────────────────────────┤             │        │ Yaklaşan ödemeler(F2) │                      │
│ Son işlemler             │             │        │ Hedefler (F4)         │                      │
├──────────────────────────┤             └────────┴───────────────────────┴──────────────────────┘
│ Özet İşlemler (+) Rapor ☰│
└──────────────────────────┘
```

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
