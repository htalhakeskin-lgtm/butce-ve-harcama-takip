# Bitti Tanımı

> **Durum:** v1.0 · **Son güncelleme:** 2026-10-15

## 1. Bu belge ne işe yarar

Bir işin ne zaman bitmiş sayılacağını tanımlar: PR, senaryo, hata düzeltmesi ve sürüm için.

## 2. Kurallar

*Her PR için*
- [ ] Başlık Conventional Commits biçiminde; açıklamada UC, FR, BR ve ADR referansları var.
- [ ] CI yeşil.
- [ ] Fark satır satır kendi kendine incelendi; unutulmuş hata ayıklama kodu ve yoruma alınmış kod yok.
- [ ] Değişikliğin türüne göre gereken testler eklendi; kural testleri numarasıyla adlandırıldı.
- [ ] Yeni kavram önce sözlüğe eklendi; kural, senaryo veya veri modeli değiştiyse ilgili belge aynı PR'da güncellendi.
- [ ] Veritabanı değişikliği migration ile geldi ve SQL'i incelendi.
- [ ] Kullanıcıya görünen metinler çeviri dosyasında.
- [ ] Arayüz değiştiyse masaüstü ve telefon ekran görüntüleri eklendi.

*Her senaryo (iş paketi) için, ek olarak*
- [ ] Senaryonun tüm kabul kriterleri karşılanıyor ve testli.
- [ ] Dikey dilim: veritabanı, eylem, ekran ve testler birlikte bitti.
- [ ] Yetki: rol tablosuna uyuyor; başka defterin verisine erişim testi var.
- [ ] Kural ihlalleri kullanıcıya ne yapacağını söyleyen Türkçe bir mesajla gösteriliyor.
- [ ] Değiştirilen kayıtlar işlem geçmişine yazılıyor.
- [ ] Ekran 360 px telefonda, tablette ve masaüstünde düzgün; açık ve koyu temada okunur.
- [ ] Yükleniyor, boş ve hata durumları tasarlandı.
- [ ] Klavyeyle kullanılabiliyor; axe taramasında ciddi ihlal yok.
- [ ] Kullanım kılavuzunun ilgili bölümü güncel.

*Her hata düzeltmesi için, ek olarak*
- [ ] Hatayı yeniden üreten test, düzeltmeden önce başarısız oldu, sonra geçti.
- [ ] PR açıklamasında kök neden bir iki cümleyle yazılı.

*Her sürüm (faz sonu) için*
- [ ] Fazın çıkış kriterleri karşılandı; demo senaryoları temiz veritabanında otomatik geçiyor.
- [ ] Sürümün tüm kurallarının testi var (izlenebilirlik raporunda eksik yok).
- [ ] `critical` ve `high` açık hata yok; bilinen yüksek veya kritik açıklı bağımlılık yok.
- [ ] Gece testleri son çalıştırmada yeşil.
- [ ] Migration'lar üretimde uygulandı; uygulama yayında ve sağlık kontrolü yeşil; son haftalık yedek başarılı.
- [ ] Sürüm etiketi ve değişiklik günlüğü oluştu; README, kılavuzlar ve belgelerin durum tablosu güncel.

## 3. Nasıl denetlenir

İnceleme.

## Değişiklik kaydı

| Tarih | Versiyon | Değişiklik |
|---|---|---|
| 2026-10-15 | v1.0 | İlk sürüm; proje planından (plan.md v1.1) türetildi. |
