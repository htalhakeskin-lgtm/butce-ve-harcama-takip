# İş Kuralları

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

Her kuralın numarası aynı zamanda **hata kodudur**. Sunucu ihlalde bu kodu döner, arayüz Türkçe metni çeviri dosyasından `errors.BR-TRX-004` anahtarıyla bulur. Testler kural numarasıyla adlandırılır ([testing](standards/README.md)). Faz 0'dan sonra bu bölüm `docs/03-business-rules.md`'ye taşınır.

**Tür sütunu:** *Kısıt* ihlal edilirse işlem reddedilir · *Hesaplama* bir değerin nasıl bulunduğunu tanımlar · *Tetikleyici* bir olayın sonucunu tanımlar · *Yetki* kimin yapabileceğini tanımlar · *Varsayılan* kullanıcı değiştirmezse geçerli olan değerdir.

**Genel ilke:** Uygulama gerçekte olmuş bir şeyin kaydedilmesini engellemez, uyarır. Hesap bakiyesi eksiye düşebilir, kart limiti aşılabilir, bütçe aşılabilir. Bunlar reddedilmez, görünür biçimde işaretlenir.

## 8.1 Sistem (BR-SYS)

| No | Kural | Tür |
|---|---|---|
| BR-SYS-001 | Kullanıcı yalnızca üyesi olduğu defterlerin verisini görür ve değiştirir. Başka bir defterin kaydına yapılan istek `404` gibi yanıtlanır; kaydın var olduğu bile belli edilmez. | Yetki |
| BR-SYS-002 | Her yetki ve kural denetimi sunucuda yapılır. Arayüzde düğmeyi gizlemek yalnızca kolaylıktır. | Yetki |
| BR-SYS-003 | Defter rolleri [§5.2](05-screens.md)'deki tabloya göre yetkilendirilir. | Yetki |
| BR-SYS-004 | Yeni kaydın kimliği istemcide üretilir. Aynı kimlikle ikinci kez gelen ekleme isteği yeni kayıt oluşturmaz, ilk sonucu döner (çift tıklama, zayıf bağlantıda yeniden gönderim). | Kısıt |
| BR-SYS-005 | Düzenleme, istemcinin gördüğü `version` ile yapılır. Kayıt bu arada değiştiyse kayıt reddedilir ve kullanıcıya güncel hali gösterilir. | Kısıt |
| BR-SYS-006 | "Bugün", "bu ay" ve tüm tarih hesapları kullanıcının saat dilimine göre yapılır (varsayılan `Europe/Istanbul`). | Hesaplama |
| BR-SYS-007 | Tek bir tutar en az 0,01, en fazla 1.000.000.000,00 birimdir. | Kısıt |

## 8.2 Kimlik ve oturum (BR-AUTH)

| No | Kural | Tür |
|---|---|---|
| BR-AUTH-001 | Şifre en az 10, en fazla 128 karakterdir. Büyük harf, rakam gibi bileşim kuralı yoktur. Bilinen sızıntı listelerindeki şifreler reddedilir (Have I Been Pwned, k-anonimlik yöntemiyle; şifrenin kendisi gönderilmez). Bu yaklaşım NIST SP 800-63B'nin önerisidir. | Kısıt |
| BR-AUTH-002 | E-posta doğrulanmadan giriş yapılamaz. Doğrulama bağlantısı 24 saat geçerlidir; yeniden gönderme dakikada bir kez yapılabilir. | Kısıt |
| BR-AUTH-003 | Kayıt ve şifre sıfırlama ekranları e-postanın kayıtlı olup olmadığını belli etmez; her durumda aynı mesaj gösterilir. | Kısıt |
| BR-AUTH-004 | Şifre sıfırlama bağlantısı 1 saat geçerli ve tek kullanımlıktır. Sıfırlamadan sonra kullanıcının tüm oturumları kapanır. | Kısıt |
| BR-AUTH-005 | Giriş denemeleri IP başına dakikada 10 ile sınırlıdır. Aynı e-posta için 15 dakika içinde 5 başarısız denemeden sonra o e-postayla giriş 15 dakika bekletilir. Kullanıcıya hesabın var olup olmadığını belli etmeyen genel bir mesaj gösterilir. | Kısıt |
| BR-AUTH-006 | Oturum 30 gün geçerlidir ve kullanıldıkça uzar. Şifre veya e-posta değiştirme, iki adımlı doğrulamayı kapatma, veri indirme ve hesap silme işlemleri mevcut şifrenin yeniden girilmesini ister. | Kısıt |
| BR-AUTH-007 | Şifre değiştirildiğinde mevcut oturum dışındaki tüm oturumlar kapanır. | Tetikleyici |
| BR-AUTH-008 | İki adımlı doğrulama TOTP'dir (6 hane, 30 saniye). Açılırken 10 tek kullanımlık yedek kod verilir. Kullanıcı "Bu cihazda 30 gün sorma" seçeneğini işaretleyebilir. | Kısıt |
| BR-AUTH-009 | Google ile girişte, aynı e-postayla doğrulanmış bir hesap varsa Google hesabı ona bağlanır. Google ile açılan hesap sonradan şifre belirleyebilir. | Tetikleyici |
| BR-AUTH-010 | Daha önce görülmemiş bir cihaz veya tarayıcıdan giriş yapıldığında e-posta gönderilir. E-postadaki "Bu ben değilim" bağlantısı tüm oturumları kapatır ve şifre sıfırlamaya yönlendirir. | Tetikleyici |
| BR-AUTH-011 | Askıya alınmış kullanıcı giriş yapamaz; açık oturumları hemen kapanır. | Kısıt |
| BR-AUTH-012 | Hesap silme kalıcıdır: kişisel defter, sahip olunan ortak defterler, ekler ve bildirimler silinir. Kullanıcı başka üyeleri olan bir ortak defterin tek sahibiyse önce sahipliği devretmelidir. | Kısıt |

## 8.3 Defter ve paylaşım (BR-LDG)

| No | Kural | Tür |
|---|---|---|
| BR-LDG-001 | Her kullanıcının tam olarak bir kişisel defteri vardır. Kişisel defter silinemez ve paylaşılamaz; paylaşım için ayrı bir ortak defter açılır. | Kısıt |
| BR-LDG-002 | Ortak defterin en fazla 10 üyesi olabilir. | Kısıt |
| BR-LDG-003 | Davet 7 gün geçerli ve tek kullanımlıktır. Yalnızca davet edilen e-postayla oturum açmış kullanıcı kabul edebilir; kayıtlı değilse önce kayıt olur. Davetle gelen kullanıcı, kayıt modu kapalı olsa bile kayıt olabilir. | Kısıt |
| BR-LDG-004 | Defterin en az bir sahibi olur. Son sahip defterden ayrılamaz ve kendi rolünü düşüremez. | Kısıt |
| BR-LDG-005 | Defterin para birimi yalnızca defterde hiç işlem yokken değiştirilebilir. | Kısıt |
| BR-LDG-006 | Üye çıkarıldığında girdiği işlemler defterde kalır; işlem geçmişinde adı görünmeye devam eder. | Tetikleyici |
| BR-LDG-007 | Kullanıcı bir anda tek bir defterde çalışır; defter üst çubuktan değiştirilir ve son seçilen defter hatırlanır. | Varsayılan |

## 8.4 Hesaplar ve dashboard (BR-ACC, BR-DSH)

| No | Kural | Tür |
|---|---|---|
| BR-ACC-001 | Hesap bakiyesi = açılış bakiyesi + gelirler − giderler + gelen transferler − giden transferler. Yalnızca tarihi bugün veya öncesi olan ve silinmemiş işlemler sayılır. | Hesaplama |
| BR-ACC-002 | Kredi kartının bakiyesi borçtur ve eksi olarak tutulur: harcama borcu artırır, karta yapılan ödeme (transfer) azaltır. Arayüzde "Borç: 4.250,00 ₺" olarak gösterilir. Açılış bakiyesi karttaki mevcut borçtur. | Hesaplama |
| BR-ACC-003 | Toplam bakiye (net varlık) = arşivlenmemiş ve "toplama dahil" işaretli hesapların bakiyeleri toplamıdır. Kart borçları eksi olarak girer. | Hesaplama |
| BR-ACC-004 | İşlemi olan hesap silinemez, arşivlenir. Arşivlenmiş hesaba yeni işlem girilemez. Bakiyesi sıfır olmayan hesap arşivlenirken uyarı gösterilir. | Kısıt |
| BR-ACC-005 | Hesap adı defter içinde benzersizdir; karşılaştırma büyük/küçük harf duyarsızdır ve Türkçe kurallarına göre yapılır (İ/i, I/ı). | Kısıt |
| BR-DSH-001 | Dashboard dört ana değeri gösterir: toplam bakiye (BR-ACC-003), seçili ayın geliri, gideri ve kalan bütçe (BR-BUD-002). Geçmiş bir ay seçildiğinde toplam bakiye o ayın son günündeki değerdir. | Hesaplama |
| BR-DSH-002 | Aylık gelir ve gider transferleri içermez. Taksitli alışverişlerde yalnızca o aya düşen taksit sayılır. | Hesaplama |

## 8.5 İşlemler (BR-TRX)

| No | Kural | Tür |
|---|---|---|
| BR-TRX-001 | İşlem türü gelir, gider veya transferdir. Tutar her zaman pozitiftir; yönü tür belirler (BR-SYS-007). | Kısıt |
| BR-TRX-002 | İşlem tarihi 2000-01-01'den önce, bugünden 5 yıldan daha ileri olamaz. İleri tarihli işlem planlıdır: bakiyeye tarihi gelince girer. | Kısıt |
| BR-TRX-003 | Gelir işleminin kalemleri yalnızca gelir kategorilerine, gider işleminin kalemleri yalnızca gider kategorilerine bağlanır. | Kısıt |
| BR-TRX-004 | Gelir ve gider işleminde en az 1, en fazla 20 kalem vardır; kalemlerin toplamı işlem tutarına eşittir. | Kısıt |
| BR-TRX-005 | Transferde kaynak ve hedef hesap farklıdır; kategori ve kalem yoktur. Transfer, gelir-gider raporlarına ve bütçeye girmez. | Kısıt |
| BR-TRX-006 | Arşivlenmiş hesap veya kategoriyle yeni işlem girilemez. Var olan işlemler korunur; düzenlenirken mevcut arşivli değer kalabilir. | Kısıt |
| BR-TRX-007 | Açıklama en fazla 200, not en fazla 2.000 karakterdir. | Kısıt |
| BR-TRX-008 | Silinen işlem çöp kutusuna gider ve 30 gün içinde geri yüklenebilir; sonra ekleriyle birlikte kalıcı silinir. Silmeden hemen sonra 10 saniye boyunca "Geri al" sunulur. | Tetikleyici |
| BR-TRX-009 | Taksit işleminin tutarı, hesabı ve tarihi yalnızca taksit planı üzerinden değişir. Açıklama, kategori, etiket ve not tek tek düzenlenebilir. | Kısıt |
| BR-TRX-010 | Tekrarlayan kuraldan üretilen işlem, üretildikten sonra bağımsızdır; düzenlenmesi kuralı değiştirmez. | Kısıt |
| BR-TRX-011 | Etiket adı defter içinde benzersizdir ve en fazla 30 karakterdir. Bir işlemin en fazla 10 etiketi olur. | Kısıt |
| BR-TRX-012 | İşlem listesi varsayılan olarak tarihe göre yeniden eskiye, aynı gün içinde ekleme sırasına göre sıralanır. | Varsayılan |

## 8.6 Kategoriler ve kategori kuralları (BR-CAT, BR-RULE)

| No | Kural | Tür |
|---|---|---|
| BR-CAT-001 | Kategoriler en fazla iki seviyedir; alt kategorinin alt kategorisi olmaz. | Kısıt |
| BR-CAT-002 | Alt kategorinin türü (gelir/gider) üst kategorisininkiyle aynıdır. | Kısıt |
| BR-CAT-003 | Kategori adı aynı üst kategori ve tür içinde benzersizdir (BR-ACC-005'teki karşılaştırma). | Kısıt |
| BR-CAT-004 | Kullanılmış kategori silinemez. Ya arşivlenir ya da başka bir kategoriyle birleştirilir: kalemleri, bütçe limitleri ve kuralları hedef kategoriye taşınır, kaynak silinir. Birleştirme işlem geçmişine yazılır. | Kısıt |
| BR-CAT-005 | Alt kategorisi olan bir üst kategoriye doğrudan kalem bağlanabilir; raporlarda "{Üst kategori} (diğer)" olarak görünür. | Hesaplama |
| BR-CAT-006 | Kayıtta kullanıcının dilinde varsayılan kategoriler oluşturulur. **Gider:** Market; Yemek ve Kafe; Ulaşım (Yakıt, Toplu taşıma, Taksi); Faturalar (Elektrik, Su, Doğalgaz, İnternet, Telefon); Kira; Ev; Sağlık; Eğitim; Giyim; Eğlence; Abonelikler; Kişisel bakım; Hediye; Diğer. **Gelir:** Maaş; Ek gelir; Faiz ve getiri; Hediye; Diğer. | Varsayılan |
| BR-CAT-007 | Raporlarda üst kategori, alt kategorilerinin toplamını gösterir; kullanıcı alt kategoriye inebilir. | Hesaplama |
| BR-RULE-001 | Kategori kuralı açıklama alanında "içerir", "ile başlar" veya "eşittir" ile eşleşir. Eşleşme büyük/küçük harf ve Türkçe karakter duyarsızdır. | Hesaplama |
| BR-RULE-002 | Birden çok kural eşleşirse önceliği yüksek olan, öncelikler eşitse deseni en uzun olan uygulanır. | Hesaplama |
| BR-RULE-003 | Kural bir öneridir. Elle girişte, kullanıcı kategoriyi kendisi seçmediyse kategori alanını doldurur; içe aktarmada önizlemeye yansır. Var olan işlemlere kendiliğinden uygulanmaz; "Mevcut işlemlere uygula" önizlemeli ayrı bir eylemdir. | Tetikleyici |
| BR-RULE-004 | İçe aktarma önizlemesinde kullanıcı bir satırın kategorisini değiştirince "Bunu kural yap" önerilir. | Tetikleyici |

## 8.7 Bütçe (BR-BUD)

| No | Kural | Tür |
|---|---|---|
| BR-BUD-001 | Genel aylık bütçe ve kategori bütçeleri birbirinden bağımsız ve isteğe bağlıdır. | Kısıt |
| BR-BUD-002 | Kalan bütçe = genel limit − ayın harcanan gideri − ayın planlı gideri. Harcanan ve planlı ayrı gösterilir. Genel limit yoksa kart "Gelir − gider" başlığıyla ayın geliri − gideri gösterir. | Hesaplama |
| BR-BUD-003 | Bir limit belirlendiği aydan itibaren yeni bir limit girilene kadar geçerlidir. Değiştirirken kullanıcı "Yalnızca bu ay" veya "Bu aydan itibaren" seçer. Geçmiş ayların limitleri sonraki değişikliklerden etkilenmez. | Hesaplama |
| BR-BUD-004 | Üst kategori bütçesi alt kategorilerinin harcamasını kapsar. Alt kategori limitlerinin toplamı üst limiti aşarsa uyarı gösterilir, kayıt engellenmez. | Hesaplama |
| BR-BUD-005 | Bütçe yalnızca giderleri kapsar; gelir ve transfer girmez. Taksitli alışverişte yalnızca o aya düşen taksit sayılır. | Hesaplama |
| BR-BUD-006 | Eşikler %80 (yaklaşıyor) ve %100 (aşıldı). Durum renk, simge ve metinle birlikte gösterilir; yalnızca renge dayanmaz. | Hesaplama |

## 8.8 Tekrarlayan işlemler (BR-REC)

| No | Kural | Tür |
|---|---|---|
| BR-REC-001 | Sıklık günlük, haftalık (haftanın günü), aylık (ayın günü) veya yıllıktır; aralık verilebilir ("her 2 ayda bir"). | Kısıt |
| BR-REC-002 | **Ay sonu kuralı:** Ayın 29, 30 veya 31'i seçildiyse bu gün olmayan aylarda ayın son günü kullanılır. Taksit ve ekstre tarihleri de bu kurala uyar. | Hesaplama |
| BR-REC-003 | Mod "otomatik" ise işlem tarihi gelince oluşur. Mod "onaylı" ise işlem onay bekler; kullanıcı onaylarken tutarı değiştirebilir (ör. değişken fatura) veya o tekrarı atlayabilir. | Tetikleyici |
| BR-REC-004 | Günlük iş bir gün çalışmazsa sonraki çalışmada kaçırılan tüm tarihler işlenir. Aynı kural ve tarih için ikinci işlem oluşmaz (`(recurring_rule_id, recurring_on)` benzersiz). | Kısıt |
| BR-REC-005 | Kullanıcı uygulamayı açtığında da kendi defterinin zamanı gelmiş kuralları işlenir; günlük işi beklemez. | Tetikleyici |
| BR-REC-006 | Kuralı düzenlemek, duraklatmak veya silmek daha önce üretilmiş işlemleri değiştirmez. | Kısıt |
| BR-REC-007 | Kural bir bitiş tarihinde veya belirli bir tekrar sayısından sonra biter ve "tamamlandı" olarak işaretlenir. | Tetikleyici |

## 8.9 Kredi kartı ve taksit (BR-CC, BR-INS)

| No | Kural | Tür |
|---|---|---|
| BR-CC-001 | Kredi kartında limit, hesap kesim günü, son ödeme günü ve asgari ödeme oranı tanımlanır. Günler 1–31 arasıdır ve ay sonu kuralına uyar (BR-REC-002). | Kısıt |
| BR-CC-002 | Ekstre dönemi, önceki hesap kesim tarihinin ertesi gününden bu hesap kesim tarihine kadardır. | Hesaplama |
| BR-CC-003 | Dönem borcu = hesap kesim tarihindeki kart borcu − kesimden sonra karta yapılan ödemeler. Sıfırın altına inmez. | Hesaplama |
| BR-CC-004 | Asgari ödeme = dönem borcu × asgari ödeme oranı. Oran, yasal düzenlemeye ve karta göre değiştiği için kullanıcı tarafından girilir. Varsayılan değer Faz 2'de güncel düzenlemeye bakılarak belirlenir. | Hesaplama |
| BR-CC-005 | Kart borcu ödemesi, bir banka veya nakit hesabından karta yapılan transferdir. "Borcu öde" kısayolu dönem borcunu veya asgari ödemeyi önerir. | Tetikleyici |
| BR-CC-006 | Kullanılabilir limit = kart limiti − güncel borç − tarihi gelmemiş taksitlerin toplamı. Limit aşılsa da işlem kaydedilir, uyarı gösterilir. | Hesaplama |
| BR-INS-001 | Taksitli alışveriş yalnızca kredi kartı hesabında ve gider türünde yapılır; taksit sayısı 2–36 arasıdır. | Kısıt |
| BR-INS-002 | Taksit tutarı = toplam ÷ taksit sayısı, kuruşa aşağı yuvarlanır. Artan kuruşlar ilk taksite eklenir: 1.000,00 ₺ / 3 → 333,34 + 333,33 + 333,33. | Hesaplama |
| BR-INS-003 | Plan oluşturulurken tüm taksitler ayrı gider işlemleri olarak yazılır. İlk taksit alışveriş tarihindedir, sonrakiler izleyen aylarda aynı gündedir (BR-REC-002). | Tetikleyici |
| BR-INS-004 | Kart borcu yalnızca tarihi gelmiş taksitleri içerir (BR-ACC-001). Bütçe ve raporlarda her taksit kendi ayında sayılır. | Hesaplama |
| BR-INS-005 | Planın toplamı, taksit sayısı ve ilk tarihi yalnızca hiçbir taksitin tarihi gelmemişken değiştirilebilir. | Kısıt |
| BR-INS-006 | Plan iptal edildiğinde (iade, erken kapama) tarihi gelmemiş taksitler silinir, gelmiş olanlar kalır. Erken kapamada kalan tutar isteğe bağlı olarak bugün tarihli tek bir işlem olarak yazılır. | Tetikleyici |

## 8.10 Birikim hedefleri (BR-GOAL)

| No | Kural | Tür |
|---|---|---|
| BR-GOAL-001 | Hedef bir hesaba bağlıysa ilerleme o hesabın bakiyesidir. Bağlı değilse ilerleme katkıların toplamıdır. | Hesaplama |
| BR-GOAL-002 | Aylık gereken tutar = (hedef − ilerleme) ÷ hedef tarihine kalan ay sayısı (en az 1). Hedef tarihi yoksa gösterilmez. | Hesaplama |
| BR-GOAL-003 | Katkı bir ayırma kaydıdır, hesap bakiyesini değiştirmez. Geri çekme eksi katkıdır; katkıların toplamı sıfırın altına inemez. | Kısıt |
| BR-GOAL-004 | İlerleme hedefe ulaşınca hedef "ulaşıldı" olarak işaretlenir ve bildirim gönderilir. | Tetikleyici |

## 8.11 İçe aktarma, ekler ve fiş okuma (BR-IMP, BR-ATT, BR-RCP)

| No | Kural | Tür |
|---|---|---|
| BR-IMP-001 | Dosya CSV'dir; en fazla 5 MB ve 5.000 satır. Kodlama UTF-8 veya Windows-1254'tür (otomatik tespit, elle değiştirilebilir). Ayırıcı virgül, noktalı virgül veya sekmedir. | Kısıt |
| BR-IMP-002 | Sütun eşlemede tarih, tutar ve açıklama zorunludur. Tutar tek bir işaretli sütundan ya da ayrı borç/alacak sütunlarından gelir. Tarih biçimi ve ondalık ayırıcı seçilir (`1.234,56` veya `1,234.56`). Eşleme hesap başına hatırlanır. | Kısıt |
| BR-IMP-003 | İçe aktarmadan önce her satırın sonucu gösterilir: eklenecek, mükerrer veya hatalı (nedeniyle birlikte). | Tetikleyici |
| BR-IMP-004 | Aynı hesapta tarihi, tutarı ve sadeleştirilmiş açıklaması aynı olan bir işlem varsa satır mükerrer sayılır ve varsayılan olarak atlanır. | Hesaplama |
| BR-IMP-005 | Kategori kuralları uygulanır; eşleşmeyen satırlar ilgili türün "Diğer" kategorisine düşer ve önizlemede değiştirilebilir. | Varsayılan |
| BR-IMP-006 | İçe aktarma tek veritabanı işlemiyle yapılır: satırların ya hepsi eklenir ya hiçbiri. | Kısıt |
| BR-IMP-007 | Bir içe aktarma 30 gün içinde bütün olarak geri alınabilir; o partiden gelen işlemler çöp kutusuna taşınır. | Tetikleyici |
| BR-ATT-001 | Ek türleri JPEG, PNG, WebP, HEIC ve PDF'tir; dosya başına en fazla 10 MB, işlem başına en fazla 5 ek. Tür, dosya adına göre değil içeriğine göre denetlenir. | Kısıt |
| BR-ATT-002 | Görsellerin EXIF bilgisi (konum dahil) silinir; görseller en uzun kenarı 2.000 piksel olacak şekilde küçültülür. | Tetikleyici |
| BR-ATT-003 | Dosyalar herkese kapalı bir kovada durur. Erişim, yalnızca defter üyelerine verilen ve 5 dakika geçerli imzalı adresle olur. | Yetki |
| BR-ATT-004 | İşlem kalıcı silinince ekleri de depodan silinir. | Tetikleyici |
| BR-RCP-001 | Fiş okumanın sonucu bir öneridir. İşlem formu önerilen değerlerle dolar, güveni düşük alanlar işaretlenir; kullanıcı kaydetmeden işlem oluşmaz. | Kısıt |
| BR-RCP-002 | Okunan para birimi defterinkinden farklıysa uyarı gösterilir; kur çevrimi yapılmaz. | Kısıt |
| BR-RCP-003 | Kullanıcı özelliği ilk kullanımda bir bilgilendirmeyi onaylayarak açar ve ayarlardan kapatabilir. Yönetici özelliği tüm sistemde kapatabilir. | Yetki |
| BR-RCP-004 | Kullanıcı başına aylık okuma kotası vardır (varsayılan 50, yönetici değiştirir). Kota dolunca fiş eklenebilir ama okunamaz. | Kısıt |

## 8.12 Bildirimler (BR-NTF)

| No | Kural | Tür |
|---|---|---|
| BR-NTF-001 | Bildirim türleri: bütçe %80, bütçe aşıldı, onay bekleyen tekrarlayan işlem, yaklaşan tekrarlayan ödeme, kart son ödeme günü, hedefe ulaşıldı, aylık özet, yeni cihazdan giriş, defter daveti, üyelik değişikliği. | — |
| BR-NTF-002 | Aynı olay için tek bildirim gönderilir. Her bildirimin tekil bir anahtarı vardır (ör. `budget-80:{defter}:{kategori}:2026-10`); bütçe eşiği ayda kategori başına bir kez bildirilir. | Kısıt |
| BR-NTF-003 | Uygulama içi ve e-posta kanalları her tür için ayrı açılıp kapanır. Güvenlik bildirimleri (yeni cihaz, şifre değişikliği) kapatılamaz. | Yetki |
| BR-NTF-004 | Hatırlatmalar varsayılan olarak 3 gün önce gönderilir; kullanıcı 1–7 gün arasında değiştirebilir. | Varsayılan |
| BR-NTF-005 | Aylık özet her ayın 1'inde, kullanıcının saat diliminde sabah gönderilir. Önceki ayda işlemi olmayan kullanıcıya gönderilmez. E-posta tutar içerdiği için aylık özet varsayılan olarak kapalıdır ve hoş geldin akışında sorulur. | Varsayılan |
| BR-NTF-006 | Ortak defterde bütçe ve hatırlatma bildirimleri her üyeye, kendi tercihine göre gönderilir. | Tetikleyici |
| BR-NTF-007 | Okunmuş bildirimler 90 gün sonra silinir. | Tetikleyici |

## 8.13 Raporlar (BR-RPT)

| No | Kural | Tür |
|---|---|---|
| BR-RPT-001 | Raporlar yalnızca gelir ve gider kalemlerini kullanır; transferler girmez. | Hesaplama |
| BR-RPT-002 | Raporlar varsayılan olarak bugüne kadar olan işlemleri gösterir. "Planlıları dahil et" seçilirse ileri tarihli işlemler ayrı bir seri olarak eklenir. | Varsayılan |
| BR-RPT-003 | Tasarruf oranı = (gelir − gider) ÷ gelir. Gelir sıfırsa gösterilmez. | Hesaplama |
| BR-RPT-004 | Kategori dağılımı grafiğinde payı %3'ün altındaki kategoriler "Diğer" altında birleşir; yanındaki tabloda hepsi ayrı görünür. | Hesaplama |
| BR-RPT-005 | "Geçen aya göre" karşılaştırması, bu ayın bugüne kadarki kısmını geçen ayın aynı gününe kadarki kısmıyla karşılaştırır. | Hesaplama |
| BR-RPT-006 | Tüm raporlar hesap ve tarih aralığına göre filtrelenebilir. | — |

## 8.14 İşlem geçmişi, yönetim, demo ve gizlilik (BR-AUD, BR-ADM, BR-DEMO, BR-PRV)

| No | Kural | Tür |
|---|---|---|
| BR-AUD-001 | İşlem, hesap, kategori, bütçe, kural, hedef ve üyelik değişiklikleri kaydedilir: eylem (oluşturma, değişiklik, silme, geri yükleme, birleştirme), değişen alanların önceki ve sonraki değerleri, kim, ne zaman. | Tetikleyici |
| BR-AUD-002 | Geçmiş kayıtları değiştirilemez ve tek tek silinemez; defter silinince birlikte silinir. | Kısıt |
| BR-AUD-003 | Şifre, token, iki adımlı doğrulama sırrı gibi gizli bilgiler geçmişe yazılmaz. | Kısıt |
| BR-ADM-001 | Yönetici yalnızca hesap bilgilerini görür: e-posta, ad, kayıt tarihi, son giriş, doğrulama ve iki adımlı doğrulama durumu, defter ve işlem sayısı. Finansal içeriği göremez; yöneticiye hiçbir defterde rol verilmez. | Yetki |
| BR-ADM-002 | Kayıt modu açık, davetli veya kapalıdır. Davetli modda yalnızca yönetici davet bağlantısıyla, kapalı modda yalnızca defter davetiyle kayıt olunur (BR-LDG-003). | Kısıt |
| BR-ADM-003 | Askıya alınan kullanıcının oturumları kapanır ve giriş yapamaz (BR-AUTH-011); verileri silinmez. Askı kaldırılabilir. | Tetikleyici |
| BR-ADM-004 | Yönetici kendini askıya alamaz ve yöneticilikten çıkaramaz; sistemde en az bir yönetici kalır. | Kısıt |
| BR-ADM-005 | İlk yönetici kurulum betiğiyle atanır; sonrakileri bir yönetici atar. Yönetici eylemleri ayrı bir günlüğe yazılır. | Yetki |
| BR-DEMO-001 | "Demo'yu dene" her ziyaretçi için ayrı, geçici bir demo kullanıcısı ve örnek verili bir defter oluşturur. Ziyaretçiler birbirinin değişikliklerini görmez. | Tetikleyici |
| BR-DEMO-002 | Örnek veri: son 6 ayın gerçekçi işlemleri, 3 hesap (banka, nakit, kredi kartı), genel ve kategori bütçeleri, 1 taksit planı, 2 tekrarlayan kural, 1 birikim hedefi. | Varsayılan |
| BR-DEMO-003 | Demo kullanıcısına e-posta gönderilmez. Fiş okuma, dosya yükleme, davet ve hesap güvenliği ayarları kapalıdır. Her ekranda "Demo modundasınız" şeridi görünür. | Kısıt |
| BR-DEMO-004 | Demo kullanıcıları 24 saat sonra tüm verileriyle silinir ve yönetici istatistiklerine girmez. | Tetikleyici |
| BR-PRV-001 | Kayıtta aydınlatma metninin okunduğu ve kullanım koşullarının kabul edildiği iki ayrı onay kutusuyla alınır. Onaylanan metin sürümü ve zamanı saklanır. Metin değişirse sonraki girişte yeniden onay istenir. | Kısıt |
| BR-PRV-002 | "Verilerimi indir" kullanıcının profilini, kişisel defterini ve sahibi olduğu ortak defterleri JSON olarak, ekleriyle birlikte bir ZIP dosyasında verir. | — |
| BR-PRV-003 | Loglara ve hata izleme sistemine e-posta, tutar, açıklama, not ve dosya içeriği yazılmaz; kullanıcı yalnızca kimliğiyle anılır. | Kısıt |

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
