---
baslik: "Açık Rıza Formu"
kod: "acik-riza-formu"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - isletme_unvani
  - ilgili_kisi_ad_soyad
  - ilgili_kisi_telefon
  - form_tarihi
  - aydinlatma_metni_surumu
  - imza_yontemi
opsiyonel_alanlar:
  - ilgili_kisi_eposta
  - riza_ticari_ileti_sms
  - riza_ticari_ileti_arama
  - riza_ticari_ileti_eposta
  - riza_arama_kaydi
  - riza_yurt_disi_aktarim
  - riza_fotograf_video
  - bulut_saglayici_ulke
  - otp_dogrulama_kodu_ref
  - zaman_damgasi
  - isletme_eposta
dayanak:
  - "6698 sayılı Kişisel Verilerin Korunması Kanunu md. 3 (açık rıza tanımı), md. 5/1, md. 9 (7499 sayılı Kanun ile değişik — teyit edilmeli)"
  - "6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun md. 6 (ticari elektronik ileti onayı)"
  - "Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik ve İleti Yönetim Sistemi (İYS)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# AÇIK RIZA FORMU

**Veri sorumlusu:** {{isletme_unvani}}
**İlgili kişi:** {{ilgili_kisi_ad_soyad}} — Tel: {{ilgili_kisi_telefon}} — E-posta: {{ilgili_kisi_eposta}}

**{{aydinlatma_metni_surumu}}** sürümlü Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni'ni okudum ve anladım. Aşağıdaki her bir işleme faaliyeti için ayrı ayrı tercihimi belirtiyorum.

**Önemli:** Açık rıza vermek **zorunlu değildir**. Rıza vermemeniz veya daha sonra geri almanız, Ofis'ten alacağınız emlak aracılık hizmetini **hiçbir şekilde etkilemez**; hizmet, rıza şartına bağlanmaz. Rızanızı her zaman, geriye etkili olmamak üzere, {{isletme_eposta}} adresine bildirerek, müşteri portalından veya ticari iletilerdeki ret bağlantısı / İYS üzerinden geri alabilirsiniz.

*Uygulama notu: Tüm kutucuklar varsayılan olarak **boş** gelir; önceden işaretlenmiş kutucuk kullanılamaz. Her kutucuk ayrı kayıt olarak zaman damgasıyla saklanır.*

---

### 1. Ticari Elektronik İleti (İYS)

Yeni portföyler, kampanyalar, piyasa raporları ve etkinlikler hakkında tarafıma ticari elektronik ileti gönderilmesini ve bu amaçla iletişim bilgilerimin işlenmesini:

| Kanal | Onaylıyorum | Onaylamıyorum |
|---|---|---|
| SMS / anlık mesaj | [ ] | [ ] |
| Sesli arama | [ ] | [ ] |
| E-posta | [ ] | [ ] |

Kayıt: SMS {{riza_ticari_ileti_sms}} · Arama {{riza_ticari_ileti_arama}} · E-posta {{riza_ticari_ileti_eposta}}

*Verilen onaylar, 6563 sayılı Kanun ve ilgili yönetmelik uyarınca İleti Yönetim Sistemi'ne (İYS) kaydedilir. İYS'ye kaydedilmeyen onaylar geçersiz sayılabilir (teyit edilmeli). Aktif işleminizle ilgili (randevu, sözleşme, ödeme hatırlatması gibi) bilgilendirmeler ticari ileti kapsamında değildir ve bu onaya bağlı değildir.*

### 2. Telefon Görüşmelerinin Kaydedilmesi

Ofis ile yaptığım telefon görüşmelerinin, hizmet kalitesinin ölçülmesi, taleplerimin doğru kaydedilmesi ve olası uyuşmazlıklarda ispat amacıyla ses kaydına alınmasına ve bu kayıtların **[saklama süresi — teyit edilmeli]** süreyle saklanmasına:

[ ] Açık rıza veriyorum [ ] Açık rıza vermiyorum — Kayıt: {{riza_arama_kaydi}}

### 3. Yurt Dışına Aktarım

Kişisel verilerimin, Aydınlatma Metni'nin 4.2 maddesinde açıklanan ve standart sözleşme gibi uygun güvencelerin bulunmadığı **arızi** hâllerle sınırlı olmak üzere, Ofis'in kullandığı bulut ve iletişim hizmet sağlayıcılarının **{{bulut_saglayici_ulke}}** konumundaki sunucularına aktarılmasına:

[ ] Açık rıza veriyorum [ ] Açık rıza vermiyorum — Kayıt: {{riza_yurt_disi_aktarim}}

*Hukuki not (teyit edilmeli): 7499 sayılı Kanun ile değişik KVKK md. 9 uyarınca açık rıza, yurt dışı aktarım için yalnızca arızi aktarımlarda başvurulabilecek bir istisnadır. Düzenli bulut aktarımı standart sözleşmeye dayandırılmalı; bu kutucuk ana dayanak olarak kullanılmamalıdır. Aktarımın olası riskleri hakkında ilgili kişinin bilgilendirilmesi gerekir.*

### 4. Fotoğraf ve Video

Taşınmaz çekimleri, etkinlikler, müşteri memnuniyeti içerikleri veya sosyal medya paylaşımları sırasında **tanınabilir şekilde** görüntümün/sesimin kaydedilmesine ve Ofis'in web sitesi, sosyal medya hesapları ve ilanlarında pazarlama amacıyla kullanılmasına:

[ ] Açık rıza veriyorum [ ] Açık rıza vermiyorum — Kayıt: {{riza_fotograf_video}}

---

**Tarih:** {{form_tarihi}}
**İmza yöntemi:** {{imza_yontemi}} (Islak imza / SMS-OTP / Nitelikli e-imza)
OTP referansı: {{otp_dogrulama_kodu_ref}} — Zaman damgası: {{zaman_damgasi}}

**İlgili kişi:** {{ilgili_kisi_ad_soyad}} — İmza: ............................

---
*Belge kodu: acik-riza-formu · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
