---
baslik: "Ortak Satış (Co-Broke) Hizmet Bedeli Paylaşım Protokolü"
kod: "ortak-satis-protokolu"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - protokol_no
  - protokol_tarihi
  - portfoy_isletme_unvani
  - portfoy_isletme_yetki_belgesi_no
  - portfoy_isletme_vergi_no
  - portfoy_danisman_ad_soyad
  - alici_isletme_unvani
  - alici_isletme_yetki_belgesi_no
  - alici_isletme_vergi_no
  - alici_danisman_ad_soyad
  - portfoy_no
  - tasinmaz_acik_adres
  - ada
  - parsel
  - bagimsiz_bolum_no
  - islem_turu
  - yetki_sozlesmesi_no
  - yetki_sozlesmesi_bitis_tarihi
  - paylasim_esasi
  - portfoy_isletme_pay_orani
  - alici_isletme_pay_orani
  - odeme_suresi_gun
opsiyonel_alanlar:
  - musteri_kodu
  - sabit_paylasim_tutari
  - musteri_koruma_suresi_ay
  - ozel_sartlar
  - yetkili_mahkeme_yeri
dayanak:
  - "Taşınmaz Ticareti Hakkında Yönetmelik (yetki belgesi, yetkilendirme ve hizmet bedeli üst sınırları — madde numaraları teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu (genel hükümler; simsarlık md. 520 vd. — teyit edilmeli)"
  - "6102 sayılı Türk Ticaret Kanunu (tacirler arası ilişkiler)"
  - "6698 sayılı Kişisel Verilerin Korunması Kanunu (veri paylaşımı)"
  - "4054 sayılı Rekabetin Korunması Hakkında Kanun (fiyat/komisyon koordinasyonu yasağı — değerlendirme önerilir)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# ORTAK SATIŞ (CO-BROKE) HİZMET BEDELİ PAYLAŞIM PROTOKOLÜ

**Protokol No:** {{protokol_no}} — **Tarih:** {{protokol_tarihi}}

## Madde 1 — Taraflar

**Portföy İşletmesi (Yetkili İşletme):** {{portfoy_isletme_unvani}} — Yetki Belgesi No: {{portfoy_isletme_yetki_belgesi_no}} — Vergi No: {{portfoy_isletme_vergi_no}} — Danışman: {{portfoy_danisman_ad_soyad}}

**Alıcı/Kiracı Tarafı İşletmesi (İş Birliği İşletmesi):** {{alici_isletme_unvani}} — Yetki Belgesi No: {{alici_isletme_yetki_belgesi_no}} — Vergi No: {{alici_isletme_vergi_no}} — Danışman: {{alici_danisman_ad_soyad}}

Her iki taraf, geçerli Taşınmaz Ticareti Yetki Belgesine sahip olduğunu ve belgenin askıya alınması/iptali hâlinde diğer tarafı derhâl bilgilendireceğini beyan eder.

## Madde 2 — Konu

Bu protokol, aşağıdaki taşınmazın {{islem_turu}} işleminde tarafların iş birliği esaslarını ve hizmet bedelinin paylaşımını düzenler.

- Portföy No: {{portfoy_no}}
- Adres: {{tasinmaz_acik_adres}}
- {{ada}} ada / {{parsel}} parsel / {{bagimsiz_bolum_no}} no.lu bağımsız bölüm
- Portföy İşletmesi ile malik arasındaki yetki sözleşmesi: No {{yetki_sozlesmesi_no}}, bitiş {{yetki_sozlesmesi_bitis_tarihi}}

## Madde 3 — Temel İlkeler

**3.1** Malik ile yetki ilişkisi yalnızca Portföy İşletmesi'ndedir. İş Birliği İşletmesi, malikle doğrudan fiyat pazarlığı yapamaz, malike ayrı teklif sunamaz ve malikten hizmet bedeli talep edemez; tüm teklifler Portföy İşletmesi aracılığıyla iletilir.

**3.2** İş Birliği İşletmesi, taşınmazı yalnızca kendi müşterisine gösterir; Portföy İşletmesi'nin yazılı onayı olmadan taşınmazı kendi adına ilan etmez, EİDS üzerinden ayrı yetki talep etmez.

**3.3** Yer göstermeler, İş Birliği İşletmesi tarafından müşterisiyle düzenlenen **Yer Gösterme Belgesi** ile belgelenir ve belgenin bir sureti (uygulama üzerinden) Portföy İşletmesi'ne iletilir. Müşteri kodu: {{musteri_kodu}}

**3.4** Her işletme, kendi müşterisinden, onunla yaptığı yazılı sözleşme veya yer gösterme belgesi kapsamında hizmet bedeli talep eder. **Bir tarafın (alıcı veya satıcı) ödeyeceği toplam hizmet bedeli, iş birliği nedeniyle artmaz** ve yönetmelikteki üst sınırı aşamaz.

## Madde 4 — Hizmet Bedelinin Paylaşımı

Paylaşım esası: {{paylasim_esasi}}

- [ ] **Toplam havuz paylaşımı:** Her iki taraftan tahsil edilen hizmet bedellerinin toplamı (KDV hariç) Portföy İşletmesi'ne **%{{portfoy_isletme_pay_orani}}**, İş Birliği İşletmesi'ne **%{{alici_isletme_pay_orani}}** oranında paylaştırılır.
- [ ] **Taraf esaslı:** Her işletme kendi müşterisinden tahsil ettiği hizmet bedelini alır; ek paylaşım yapılmaz.
- [ ] **Sabit tutar:** {{sabit_paylasim_tutari}} (KDV hariç)

Paylaşım oranları toplamı %100 olmalıdır; uygulama kontrol eder.

## Madde 5 — Tahsilat, Fatura ve Ödeme

**5.1** Her işletme kendi müşterisine kendi adına fatura düzenler.

**5.2** Paylaşım sonucunda diğer işletmeye ödenecek tutar, ilgili işletmenin düzenleyeceği fatura karşılığında, hizmet bedelinin tahsilinden itibaren **{{odeme_suresi_gun}} gün** içinde banka havalesi/EFT ile ödenir.

**5.3** Hizmet bedeli tahsil edilemezse, tahsil edilemeyen kısım için paylaşım yükümlülüğü doğmaz; tahsil için yapılan makul masraflar paylaşım oranında taraflarca karşılanır.

## Madde 6 — Müşteri Koruma

İş Birliği İşletmesi'nin yer gösterdiği ve belgelediği müşteri, bu protokolün sona ermesinden itibaren **{{musteri_koruma_suresi_ay}} ay** içinde taşınmazı Portföy İşletmesi aracılığıyla edinirse, bu protokoldeki paylaşım hükümleri uygulanır. Portföy İşletmesi, İş Birliği İşletmesi'nin müşterisiyle onu devre dışı bırakacak şekilde doğrudan işlem yapmaz.

## Madde 7 — Kişisel Verilerin Paylaşımı

**7.1** Taraflar, bu protokol kapsamında birbirlerine aktardıkları kişisel veriler bakımından her biri **ayrı veri sorumlusudur**. Paylaşım, işlemin gerektirdiği asgari veriyle sınırlıdır.

**7.2** Malik iletişim bilgileri İş Birliği İşletmesi ile paylaşılmaz (ortak portföy görünürlük kuralı). Müşteri kimliği, işlem kesinleşene kadar yalnızca müşteri kodu ile paylaşılır.

**7.3** Her taraf kendi müşterisine KVKK aydınlatma metnini sunmaktan ve aktarım için gerekli hukuki sebebi sağlamaktan sorumludur.

## Madde 8 — Gizlilik ve Rekabet

Taraflar; malik, müşteri, fiyat ve pazarlık bilgilerini gizli tutar. Bu protokol, taraflar arasında genel bir hizmet bedeli oranı veya fiyat koordinasyonu anlamına gelmez; her işletme kendi müşterisiyle hizmet bedelini bağımsız olarak belirler (4054 sayılı Kanun bakımından değerlendirme önerilir).

## Madde 9 — Süre ve Sona Erme

Protokol, imza tarihinde yürürlüğe girer ve Portföy İşletmesi'nin yetki sözleşmesinin sona ermesiyle ({{yetki_sozlesmesi_bitis_tarihi}}) veya işlemin tamamlanıp paylaşımın ödenmesiyle sona erer. Madde 6, 7 ve 8 sona ermeden sonra da yürürlükte kalır.

## Madde 10 — Uyuşmazlık

Taraflar uyuşmazlıkları öncelikle müzakere ile çözmeye çalışır. Tacirler arasındaki ticari uyuşmazlıklarda dava şartı arabuluculuk hükümleri saklıdır (teyit edilmeli). {{yetkili_mahkeme_yeri}} mahkemeleri ve icra daireleri yetkilidir.

## Madde 11 — Özel Şartlar

{{ozel_sartlar}}

| PORTFÖY İŞLETMESİ | İŞ BİRLİĞİ İŞLETMESİ |
|---|---|
| {{portfoy_isletme_unvani}} | {{alici_isletme_unvani}} |
| Yetkili: {{portfoy_danisman_ad_soyad}} | Yetkili: {{alici_danisman_ad_soyad}} |
| Kaşe / İmza: | Kaşe / İmza: |

---
*Belge kodu: ortak-satis-protokolu · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
