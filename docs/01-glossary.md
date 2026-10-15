# Sözlük

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

Koddaki, veritabanındaki ve arayüzdeki adlar bu tablodan türetilir. Yeni bir kavram koda girmeden önce buraya eklenir (Faz 0'dan sonra `docs/01-glossary.md`'ye).

| Türkçe | Kod adı | Tanım |
|---|---|---|
| Kullanıcı | `User` | Uygulamaya e-posta ile kayıtlı kişi. |
| Defter | `Ledger` | Verilerin sahibi olan birim. Hesaplar, kategoriler, işlemler, bütçeler ve hedefler bir deftere aittir. Her kullanıcının silinemeyen bir **kişisel defteri** vardır; **ortak defter** birden çok üyeye sahiptir. |
| Üye | `LedgerMember` | Bir defterde rolü olan kullanıcı. Roller: sahip (`owner`), düzenleyici (`editor`), görüntüleyici (`viewer`). |
| Davet | `LedgerInvitation` | Bir e-posta adresine gönderilen, defter üyeliği için tek kullanımlık bağlantı. |
| Hesap | `Account` | Paranın durduğu yer. Türler: nakit (`cash`), banka (`bank`), kredi kartı (`credit_card`), birikim (`savings`), diğer (`other`). |
| Açılış bakiyesi | `openingBalance` | Hesabın uygulamaya eklendiği tarihteki bakiyesi. |
| İşlem | `Transaction` | Paranın hareketi. Türler: gelir (`income`), gider (`expense`), transfer (`transfer`). |
| İşlem kalemi | `TransactionLine` | Gelir veya giderin bir kategoriye düşen parçası. Normal işlemde tek kalem, bölünmüş işlemde birden çok kalem vardır. |
| Transfer | `transfer` | İki hesap arasında para hareketi. Gelir ya da gider sayılmaz. Kart borcu ödemesi bir transferdir. |
| Planlı işlem | — | Tarihi bugünden ileride olan işlem. Bakiyeye henüz girmez. |
| Kategori | `Category` | Gelir veya giderin sınıfı. Türü (`income` / `expense`) vardır. En fazla iki seviye: üst kategori ve alt kategori. |
| Etiket | `Tag` | Kategoriden bağımsız, serbest işaret (#tatil). Bir işlemin birden çok etiketi olabilir. |
| Bütçe limiti | `BudgetLimit` | Bir ay için harcama sınırı. Kategorisiz ise genel bütçe, kategorili ise kategori bütçesidir. |
| Kalan bütçe | — | Genel bütçe limiti − bu ayki gider. Limit yoksa bu ayki gelir − gider. |
| Tekrarlayan işlem kuralı | `RecurringRule` | Belirli aralıklarla işlem üreten şablon (kira, maaş, abonelik). |
| Taksit planı | `InstallmentPlan` | Kredi kartıyla yapılan, aylara bölünmüş alışveriş. Her taksit ayrı bir gider işlemidir. |
| Hesap kesim günü | `statementDay` | Kredi kartı döneminin kapandığı ayın günü. |
| Son ödeme günü | `dueDay` | Dönem borcunun ödenmesi gereken ayın günü. |
| Dönem borcu | — | Son hesap kesim tarihindeki borç − kesimden sonra yapılan ödemeler. |
| Kullanılabilir limit | — | Kart limiti − güncel borç − henüz tarihi gelmemiş taksitler. |
| Birikim hedefi | `SavingsGoal` | Hedef tutarı ve isteğe bağlı hedef tarihi olan birikim amacı. |
| Hedef katkısı | `GoalContribution` | Bir hedefe ayrılan tutar kaydı. |
| Kategori kuralı | `CategoryRule` | Açıklamaya göre kategori öneren kural ("Migros içeriyorsa → Market"). |
| İçe aktarma | `ImportBatch` | Bir CSV dosyasından tek seferde alınan işlemler. Bütün olarak geri alınabilir. |
| Ek | `Attachment` | İşleme eklenmiş fiş, fatura görseli veya PDF. |
| Fiş okuma | `ReceiptScan` | Bir ekin AI ile okunması ve önerilen işlem bilgisi. |
| Bildirim | `Notification` | Kullanıcıya uygulama içinde ve/veya e-postayla iletilen ileti. |
| İşlem geçmişi | `AuditEvent` | Bir kaydın kim tarafından, ne zaman, nasıl değiştirildiğinin kaydı. |
| Çöp kutusu | — | Silinen işlemlerin 30 gün bekletildiği yer. |
| Yönetici | `admin` | Sistemi işleten kişi. Kullanıcıları yönetir, finansal verileri göremez. |

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
