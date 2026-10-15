# Arayüz Standardı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Arayüzün nasıl görüneceğini ve davranacağını tanımlar: tasarım değişkenleri, bileşenler, formlar, geri bildirim, metinler, erişilebilirlik.

## 2. Kurallar

- **İlkeler:** önce sayılar okunur; sade ama sıkışık değil; her tıklama 100 ms içinde görünür tepki verir; hareket yalnızca bir durumu anlatmak içindir; hata önlenir, önlenemiyorsa ne yapılacağı söylenir.
- **Tasarım değişkenleri:** CSS değişkenleri ve Tailwind `@theme`. Renkler, aralıklar, köşeler ve yazı boyutları yalnızca değişkenlerden gelir; bileşende sabit renk kodu yazılmaz.
- **Renk:** nötr gri taban ve tek bir vurgu rengi. **Gelir yeşil ve "+" işaretiyle, gider normal metin renginde ve "−" işaretiyle gösterilir. Kırmızı yalnızca hata ve aşım içindir.** Böylece kırmızı, her harcamada değil, gerçekten dikkat gerektiğinde görünür.
- **Durum tonları:** başarı, uyarı, tehlike, bilgi; her biri açık ve koyu temada AA kontrastlı.
- **Kategori renkleri:** açık ve koyu tema için ayrı tonları olan 12 renkli sabit palet. Kullanıcı bu paletten seçer; serbest renk seçimi yoktur (kontrast garantisi).
- **Yazı:** tek yazı ailesi (Inter veya sistem yazı tipi; Faz 0'da Türkçe karakterlerle denenip seçilir). Tutarlarda `tabular-nums`. Gövde metni 16 px.
- **Aralık ve şekil:** 4 px ızgara; tek köşe yarıçapı ölçeği; gölge yalnızca açılır katmanlarda.
- **Hareket:** yalnızca opaklık ve renk geçişi, en fazla 150 ms; `prefers-reduced-motion` açıkken hiç hareket yok; iskelet yükleme ekranlarında parıltı efekti yok.
- **Temalar:** açık, koyu, sistem; sayfa yüklenirken yanlış tema görünmez.
- **Simgeler:** lucide, 16 / 20 / 24 px. Simge tek başına anlam taşımaz; yanında etiket ya da `aria-label` vardır.
- **Ortak bileşenler:** `MoneyInput`, `MoneyText` (işaret, renk, para birimi), `DateInput`, `DateRangePicker`, `CategoryPicker` (arama, son kullanılanlar, alt kategoriler), `AccountPicker`, `StatCard`, `BudgetBar`, `FilterBar`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `ResponsiveDialog` (masaüstünde diyalog veya yan panel, telefonda alttan açılan tam ekran panel).
- **Formlar:** React Hook Form + Zod. Doğrulama ilk gönderimde başlar, sonra alan değiştikçe güncellenir. Sunucu hataları ilgili alanın altına yazılır. Gönderirken düğme yükleniyor durumuna geçer. Kaydedilmemiş değişiklik varken çıkışta onay sorulur. Tutar alanı `inputmode="decimal"`.
- **Listeler:** masaüstünde tablo, telefonda kart listesi; tarih başlıklarıyla gruplu; tutarlar sağa hizalı; 200 satırı aşan listelerde sanal kaydırma.
- **Geri bildirim:** başarı kısa bildirimle, hata satır içinde gösterilir. Geri alınabilen eylem onay sormaz, "Geri al" sunar. Geri alınamayan eylem onay diyaloğu ister ve düğmesi eylemi adlandırır ("Kalıcı olarak sil").
- **Durumlar:** yükleniyor (iskelet; 300 ms'den kısa yüklemede hiç gösterilmez), boş (ne olduğu, ne yapılabileceği, eylem düğmesi), hata (ne oldu, tekrar dene, hata kimliği).
- **Grafikler:** eksenler etiketli; sayılar Türkçe biçimde; bir kategorinin rengi her grafikte aynı; halka grafikte en fazla 7 dilim ve "Diğer"; her grafiğin tablo karşılığı; araç ipucu klavyeyle de açılır; 3B ve dekoratif gölge yok.
- **Metinler:** "siz" hitabı; yalnızca ilk harfi büyük başlıklar; fiille düğmeler ("Kaydet", "İşlem ekle"); hata mesajı ne olduğunu ve ne yapılacağını söyler; değişken değerlere ek getirilmez ("Market'te" yerine "Kategori: Market").
- **Türkçe biçimler:** tutar `1.234,56 ₺` (sayı `Intl` ile biçimlenir; sembol, Türkiye'deki banka ve fatura alışkanlığına uyarak sona yazılır; `Intl`'in Türkçe varsayılanı sembolü başa koyduğu için bu `formatToParts` ile yapılır). İngilizcede `Intl` varsayılanı kullanılır. Tarih: uzun `15 Ekim 2026`, kısa `15 Eki`, sayısal `15.10.2026`; listelerde "Bugün", "Dün".
- **Erişilebilirlik:** WCAG 2.2 AA; her zaman görünür odak halkası; en az 44 × 44 px dokunma hedefi; renk tek başına anlam taşımaz; tüm işlemler klavyeyle yapılır.
- **Performans:** NFR-21 ve NFR-22'deki bütçeler; grafik ve PDF kütüphaneleri yalnızca gereken sayfada yüklenir.

## 3. Nasıl denetlenir

Axe taraması (uçtan uca testlerde), Lighthouse CI, PR'da masaüstü ve telefon ekran görüntüsü, faz sonlarında tasarım incelemesi.

## 4. Uygulamadaki durum

- Yazı tipi: Inter (`latin-ext` alt kümesi, Türkçe karakterler için).
- Gelir/gider grafik renkleri (`--chart-income`, `--chart-expense`) açık ve koyu temada renk körlüğü dahil palet doğrulamasından geçti.
- Kategori renkleri kullanıcı seçimi olduğu için dağılım grafiğinin yanında adlı ve tutarlı tablo her zaman görünür.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
