/**
 * Draft legal texts (A-02: legal review by the client before launch). Version must match
 * CURRENT_LEGAL_VERSION when the texts change (BR-PRV-001).
 */

export type LegalDoc = "privacy" | "terms" | "cookies";

type Section = { heading: string; paragraphs: string[] };

export const LEGAL_UPDATED = "2026-10-15";

export const LEGAL_CONTENT: Record<LegalDoc, Section[]> = {
  privacy: [
    {
      heading: "Veri sorumlusu",
      paragraphs: [
        "Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, uygulamayı kullanırken işlenen kişisel verileriniz hakkında sizi bilgilendirmek için hazırlanmıştır. Veri sorumlusunun unvanı ve iletişim bilgileri yayından önce bu bölüme eklenecektir.",
      ],
    },
    {
      heading: "İşlenen veriler",
      paragraphs: [
        "Kimlik ve iletişim verileri: adınız ve e-posta adresiniz.",
        "Finansal veriler: uygulamaya kendinizin girdiği hesaplar, gelir ve gider işlemleri, kategoriler, bütçeler ve açıklamalar.",
        "İşlem güvenliği verileri: oturum bilgileri, IP adresi, tarayıcı bilgisi ve kayıtlarınızda yapılan değişikliklerin geçmişi.",
      ],
    },
    {
      heading: "İşleme amaçları ve hukuki sebepler",
      paragraphs: [
        "Verileriniz; hesabınızı oluşturmak ve yönetmek, girdiğiniz finansal kayıtları saklamak, raporlamak ve size göstermek, hesap güvenliğini sağlamak ve yasal yükümlülükleri yerine getirmek amacıyla, KVKK madde 5/2-c (sözleşmenin ifası) ve 5/2-f (meşru menfaat) hukuki sebeplerine dayanılarak işlenir.",
      ],
    },
    {
      heading: "Aktarım ve saklama yeri",
      paragraphs: [
        "Veriler, Avrupa Birliği'nde (Frankfurt) bulunan sunucularda saklanır. Uygulamanın çalışması için barındırma, veritabanı ve e-posta gönderimi hizmeti veren alt işleyenlerden yararlanılır; bu hizmet sağlayıcıların listesi yayından önce bu bölüme eklenecektir.",
      ],
    },
    {
      heading: "Saklama süresi",
      paragraphs: [
        "Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı sildiğinizde kişisel defteriniz ve tüm verileriniz kalıcı olarak silinir. Silinen işlemler 30 gün boyunca çöp kutusunda bekletilir.",
      ],
    },
    {
      heading: "Haklarınız",
      paragraphs: [
        "KVKK madde 11 kapsamındaki haklarınızı kullanabilirsiniz. Verilerinizin bir kopyasını Ayarlar › Verilerim bölümünden indirebilir, hesabınızı aynı bölümden kalıcı olarak silebilirsiniz.",
      ],
    },
  ],
  terms: [
    {
      heading: "Hizmetin kapsamı",
      paragraphs: [
        "Uygulama, kişisel gelir ve giderlerinizi kaydetmeniz, bütçe belirlemeniz ve raporlar görmeniz için bir araçtır. Uygulama finansal danışmanlık hizmeti vermez.",
      ],
    },
    {
      heading: "Hesap güvenliği",
      paragraphs: [
        "Şifrenizin gizliliğinden siz sorumlusunuz. Hesabınızda yetkisiz bir işlem fark ederseniz şifrenizi hemen değiştirin.",
      ],
    },
    {
      heading: "Girdiğiniz veriler",
      paragraphs: [
        "Uygulamaya girdiğiniz verilerin doğruluğu size aittir. Verilerinizi istediğiniz zaman dışa aktarabilir ve hesabınızı silebilirsiniz.",
      ],
    },
    {
      heading: "Değişiklikler",
      paragraphs: ["Bu koşullar değiştiğinde, uygulamaya bir sonraki girişinizde güncel metni onaylamanız istenir."],
    },
  ],
  cookies: [
    {
      heading: "Kullanılan çerezler",
      paragraphs: [
        "Uygulama yalnızca çalışması için zorunlu olan çerezleri kullanır: oturumunuzu açık tutan güvenli oturum çerezi ve seçtiğiniz dil tercihi. Reklam veya izleme amaçlı çerez kullanılmaz; bu nedenle çerez onayı istenmez.",
      ],
    },
    {
      heading: "Tarayıcıda saklanan tercihler",
      paragraphs: ["Seçtiğiniz tema (açık, koyu, sistem) tarayıcınızın yerel depolamasında saklanır."],
    },
  ],
};
