---
baslik: "Taşınmaz Alım/Satım ve Kiralama Yetki Sözleşmesi"
kod: "yetki-sozlesmesi"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - sozlesme_no
  - sozlesme_tarihi
  - isletme_unvani
  - yetki_belgesi_no
  - isletme_mersis_no
  - isletme_vergi_dairesi
  - isletme_vergi_no
  - isletme_adres
  - isletme_telefon
  - isletme_eposta
  - sorumlu_danisman_ad_soyad
  - sorumlu_danisman_yetki_belgesi_no
  - malik_ad_soyad
  - malik_tckn
  - malik_adres
  - malik_telefon
  - malik_hisse
  - il
  - ilce
  - mahalle
  - ada
  - parsel
  - bagimsiz_bolum_no
  - tapu_turu
  - tasinmaz_niteligi
  - tasinmaz_acik_adres
  - islem_turu
  - yetki_turu
  - talep_edilen_fiyat
  - para_birimi
  - baslangic_tarihi
  - bitis_tarihi
  - hizmet_bedeli_orani
  - hizmet_bedeli_kira_ay
  - yer_gosterme_koruma_suresi_ay
opsiyonel_alanlar:
  - malik2_ad_soyad
  - malik2_tckn
  - malik2_hisse
  - vekil_ad_soyad
  - vekaletname_bilgisi
  - blok
  - kat
  - yuzolcumu_m2
  - talep_edilen_kira
  - pazarlik_payi_notu
  - anahtar_teslim_durumu
  - anahtar_teslim_tarihi
  - pazarlama_kanallari
  - ozel_sartlar
  - yetkili_mahkeme_yeri
dayanak:
  - "Taşınmaz Ticareti Hakkında Yönetmelik (yetkilendirme sözleşmesi ve hizmet bedeli hükümleri — madde numaraları teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 520 vd. (simsarlık/tellallık sözleşmesi — teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 179-182 (ceza koşulu)"
  - "Elektronik İlan Doğrulama Sistemi (EİDS) düzenlemesi — dayanak kanun/yönetmelik numarası teyit edilmeli"
  - "6698 sayılı Kişisel Verilerin Korunması Kanunu md. 10 (aydınlatma)"
  - "6502 sayılı Tüketicinin Korunması Hakkında Kanun md. 5 (haksız şartlar — malik tüketici ise)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# TAŞINMAZ ALIM/SATIM VE KİRALAMA YETKİ SÖZLEŞMESİ

**Sözleşme No:** {{sozlesme_no}}
**Düzenleme Tarihi:** {{sozlesme_tarihi}}

## Madde 1 — Taraflar

### 1.1 Yetkili İşletme (bundan sonra "İŞLETME")

| Alan | Bilgi |
|---|---|
| Ticaret unvanı | {{isletme_unvani}} |
| Taşınmaz Ticareti Yetki Belgesi No | {{yetki_belgesi_no}} |
| MERSİS No | {{isletme_mersis_no}} |
| Vergi dairesi / Vergi No | {{isletme_vergi_dairesi}} / {{isletme_vergi_no}} |
| Adres | {{isletme_adres}} |
| Telefon / E-posta | {{isletme_telefon}} / {{isletme_eposta}} |
| Sorumlu danışman | {{sorumlu_danisman_ad_soyad}} (Yetki Belgesi No: {{sorumlu_danisman_yetki_belgesi_no}}) |

### 1.2 Malik(ler) (bundan sonra "MALİK")

| # | Ad Soyad / Unvan | T.C. Kimlik No / Vergi No | Hisse Oranı |
|---|---|---|---|
| 1 | {{malik_ad_soyad}} | {{malik_tckn}} | {{malik_hisse}} |
| 2 | {{malik2_ad_soyad}} | {{malik2_tckn}} | {{malik2_hisse}} |

Adres: {{malik_adres}} — Telefon: {{malik_telefon}}

Malik adına vekâleten imza atılıyorsa: Vekil {{vekil_ad_soyad}}, Vekâletname: {{vekaletname_bilgisi}}. Vekâletnamenin taşınmazın satışı/kiralanması ve bu sözleşmenin imzalanması için yeterli yetkiyi içerdiği İŞLETME tarafından kontrol edilmiş ve bir sureti sözleşmeye eklenmiştir.

Paylı mülkiyette sözleşme, tüm paydaşlar veya yetkili temsilcileri tarafından imzalanmadıkça yalnızca imzalayan paydaşın payı bakımından hüküm doğurur. Taşınmazın tamamı için yetki verildiği, ancak tüm paydaşların imzasıyla kabul edilir.

## Madde 2 — Sözleşmeye Konu Taşınmaz

| Alan | Bilgi |
|---|---|
| İl / İlçe / Mahalle | {{il}} / {{ilce}} / {{mahalle}} |
| Ada / Parsel | {{ada}} / {{parsel}} |
| Blok / Kat / Bağımsız Bölüm No | {{blok}} / {{kat}} / {{bagimsiz_bolum_no}} |
| Tapu türü | {{tapu_turu}} (Kat mülkiyeti / Kat irtifakı / Arsa payı / Hisseli tapu / Diğer) |
| Niteliği | {{tasinmaz_niteligi}} |
| Yüzölçümü (m²) | {{yuzolcumu_m2}} |
| Açık adres | {{tasinmaz_acik_adres}} |

MALİK, taşınmaz üzerindeki ipotek, haciz, şerh, beyan ve diğer takyidatları İŞLETME'ye eksiksiz bildirdiğini; bildirmediği takyidattan doğacak sonuçlardan sorumlu olacağını kabul eder.

## Madde 3 — İşlem Türü ve Yetkinin Kapsamı

**3.1 İşlem türü:** {{islem_turu}}

- [ ] Satış
- [ ] Kiralama
- [ ] Satış ve kiralama

**3.2 Yetki türü:** {{yetki_turu}}

- [ ] **Münhasır (tek yetkili) yetki:** MALİK, sözleşme süresi boyunca taşınmazın Madde 3.1'de belirtilen işlemi için yalnızca İŞLETME'yi yetkilendirir; başka bir taşınmaz ticareti işletmesine yetki vermez.
- [ ] **Münhasır olmayan (genel) yetki:** MALİK, başka işletmelere de yetki verebilir veya taşınmazı bizzat pazarlayabilir. Bu durumda hizmet bedeli yalnızca Madde 7.2'de belirtilen hâllerde doğar.

**3.3** İŞLETME, taşınmazı pazarlamaya, ilan etmeye, alıcı/kiracı adaylarına göstermeye ve taraflar arasında görüşmelere aracılık etmeye yetkilidir. İŞLETME, MALİK adına sözleşme imzalamaya, bedel veya kapora tahsil etmeye, MALİK'i herhangi bir şekilde borç altına sokmaya **yetkili değildir**; bu yetkiler ancak ayrı ve açık bir yazılı yetkiyle verilebilir.

## Madde 4 — Talep Edilen Fiyat

**4.1** Satış için talep edilen fiyat: **{{talep_edilen_fiyat}} {{para_birimi}}**
**4.2** Kiralama için talep edilen aylık kira: **{{talep_edilen_kira}} {{para_birimi}}**
**4.3** Pazarlık payı / fiyat değişikliği notu: {{pazarlik_payi_notu}}

Fiyat değişiklikleri MALİK tarafından yazılı olarak (uygulama üzerinden onay dâhil) bildirilir. İŞLETME, MALİK'in onayı olmadan ilan fiyatını değiştiremez.

## Madde 5 — Sözleşme Süresi

**5.1** Sözleşme **{{baslangic_tarihi}}** tarihinde başlar ve **{{bitis_tarihi}}** tarihinde kendiliğinden sona erer.

**5.2** Süre, tarafların yazılı mutabakatı olmaksızın uzamaz. Uzatma, ek protokol veya uygulama üzerinden karşılıklı onay ile yapılır.

## Madde 6 — Tarafların Hak ve Yükümlülükleri

### 6.1 İŞLETME'nin yükümlülükleri

a) Faaliyetini geçerli bir Taşınmaz Ticareti Yetki Belgesi ile yürütmek; ilanlarda yetki belgesi numarasını ve işletme bilgilerini göstermek.
b) Taşınmazı gerçeğe uygun, yanıltıcı olmayan bilgi ve görsellerle tanıtmak.
c) Tapu kaydı (takyidat), imar durumu ve yapı kullanma izni gibi hususlarda erişebildiği resmî bilgileri alıcı/kiracı adaylarıyla paylaşmak ve MALİK'i bilgilendirmek.
ç) Her yer göstermede Yer Gösterme Belgesi düzenlemek ve MALİK'e talep hâlinde gösterim raporu sunmak.
d) Alınan teklifleri gecikmeksizin ve yazılı olarak MALİK'e iletmek.
e) MALİK'e ait anahtar, belge ve kişisel verileri özenle korumak.
f) Mevzuatın öngördüğü süre boyunca sözleşme ve belgeleri saklamak (saklama süresi teyit edilmeli).

### 6.2 MALİK'in yükümlülükleri

a) Taşınmaza ilişkin bilgileri (tapu, takyidat, aidat/vergi borcu, ayıplar, kiracı durumu vb.) doğru ve eksiksiz bildirmek.
b) Taşınmazın uygun zamanlarda gösterilmesine imkân sağlamak.
c) Münhasır yetkide, sözleşme süresince başka işletmeye yetki vermemek ve kendisine doğrudan gelen talepleri İŞLETME'ye yönlendirmek.
ç) EİDS yetkilendirmesini Madde 8 uyarınca yapmak.
d) Satış hâlinde DASK poliçesinin, tapu işlemi için gerekli belgelerin (emlak vergisi borcu yoktur yazısı vb.) temin edilmesine katkı sağlamak.

## Madde 7 — Hizmet Bedeli

**7.1 Tutar:**
- Satışta: satış bedelinin **%{{hizmet_bedeli_orani}} + KDV**'si.
- Kiralamada: **{{hizmet_bedeli_kira_ay}} aylık kira bedeli + KDV**.

Bu tutarlar, Taşınmaz Ticareti Hakkında Yönetmelik'te öngörülen üst sınırları (referans: satışta her bir taraftan satış bedelinin %2'si + KDV; kiralamada bir aylık kira bedeli + KDV) aşamaz. Üst sınırlar ve kiralamadaki paylaşım esası güncel yönetmelik metnine göre teyit edilmelidir. Uygulama, girilen oranın yürürlükteki üst sınırı aşmasını engeller.

**7.2 Hizmet bedelinin doğması:** Hizmet bedeli, İŞLETME'nin faaliyeti sonucunda satış veya kira sözleşmesinin kurulmasıyla (satışta tapuda devirle / kirada kira sözleşmesinin imzalanmasıyla) doğar ve bu tarihte ödenir. Ayrıca:

a) **Münhasır yetkide:** Sözleşme süresi içinde taşınmaz MALİK tarafından doğrudan veya başka bir işletme aracılığıyla satılır/kiralanırsa hizmet bedeli İŞLETME'ye ödenir.
b) **Her iki yetki türünde:** İŞLETME'nin sözleşme süresi içinde yer gösterdiği ve Yer Gösterme Belgesi ile belgelenen kişiye (veya onun eşi, birinci derece yakını ya da ortağı olduğu şirkete) taşınmaz, sözleşmenin sona ermesinden itibaren **{{yer_gosterme_koruma_suresi_ay}} ay** içinde satılır/kiralanırsa hizmet bedeli ödenir.

**7.3** Hizmet bedeli, İŞLETME'nin düzenleyeceği fatura karşılığında banka hesabına ödenir.

**7.4** Madde 7.2 kapsamındaki ödeme yükümlülüğünün niteliği (hizmet bedeli / ceza koşulu) ve koruma süresinin makullüğü hukuk danışmanınca değerlendirilmelidir. MALİK'in tüketici sıfatını taşıdığı hâllerde bu hükümlerin 6502 sayılı Kanun kapsamındaki haksız şart denetimine tabi olabileceği ve MALİK ile ayrıca müzakere edildiği bu sözleşmede kayıt altına alınmalıdır (teyit edilmeli). Ceza koşulu niteliğindeki bedeller TBK md. 182 uyarınca hâkim tarafından indirilebilir.

## Madde 8 — Elektronik İlan Doğrulama Sistemi (EİDS) Yetkilendirme Taahhüdü

**8.1** MALİK, taşınmazın internet ilan platformlarında yayımlanabilmesi için e-Devlet Kapısı üzerindeki Elektronik İlan Doğrulama Sistemi (EİDS) aracılığıyla İŞLETME'yi yetkilendirmeyi taahhüt eder.

**8.2** EİDS yetkilendirmesi tamamlanmadan İŞLETME, taşınmazı elektronik ilan platformlarında yayımlamaz. Yetkilendirmenin süresi ve kapsamı bu sözleşmenin süresi ve kapsamıyla uyumlu olmalıdır.

**8.3** Sözleşmenin herhangi bir nedenle sona ermesi hâlinde İŞLETME yayındaki ilanları derhâl kaldırır; MALİK de EİDS yetkisini geri alabilir.

## Madde 9 — Pazarlama ve İlan İzni

**9.1** MALİK, taşınmazın aşağıdaki kanallarda tanıtılmasına izin verir: {{pazarlama_kanallari}}
(Ör.: ilan portalları, İŞLETME web sitesi ve sosyal medya hesapları, ofis ağı / ortak portföy sistemi, vitrin, e-posta/mesaj ile müşteri bilgilendirme.)

**9.2** MALİK, taşınmazın fotoğraf, video, sanal tur ve kat planının İŞLETME tarafından çekilmesine/hazırlanmasına ve pazarlama amacıyla kullanılmasına izin verir. Görsellerde MALİK'e veya üçüncü kişilere ait kişisel veri ve özel eşyaların tanınabilir şekilde yer almamasına özen gösterilir.

**9.3** İlanlarda taşınmazın tam adresi ve bağımsız bölüm numarası MALİK'in ayrıca izni olmadıkça yayımlanmaz.

**9.4** İŞLETME, taşınmazı anlaşmalı diğer yetkili işletmelerle ortak satış protokolü kapsamında paylaşabilir. Hizmet bedeli MALİK için artmaz.

## Madde 10 — Anahtar Teslimi

Anahtar teslim durumu: {{anahtar_teslim_durumu}} — Teslim tarihi: {{anahtar_teslim_tarihi}}

Anahtar teslim edilmişse İŞLETME anahtarı kilitli ve kayıtlı şekilde muhafaza eder, yalnızca yer gösterme amacıyla kullanır ve üçüncü kişilere refakatsiz teslim etmez. Anahtar, sözleşmenin sona ermesinde veya MALİK'in talebiyle derhâl ve tutanakla iade edilir.

## Madde 11 — Yer Gösterme

**11.1** Yer göstermeler İŞLETME'nin yetki belgeli çalışanı veya danışmanı refakatinde yapılır.

**11.2** Her yer göstermede, gösterilen kişi(ler)le Yer Gösterme Belgesi düzenlenir ve imzalanır (uygulama üzerinden OTP ile elektronik onay dâhil).

**11.3** Kiracılı taşınmazlarda yer gösterme, kiracının hakları gözetilerek önceden bildirilmiş gün ve saatlerde yapılır.

## Madde 12 — Fesih ve Sona Erme

**12.1** Sözleşme; sürenin dolması, işlemin tamamlanması veya tarafların yazılı anlaşmasıyla sona erer.

**12.2** Taraflardan biri yükümlülüklerini ağır biçimde ihlal ederse diğer taraf yazılı bildirimle sözleşmeyi feshedebilir.

**12.3** İŞLETME'nin Taşınmaz Ticareti Yetki Belgesinin iptali veya askıya alınması hâlinde MALİK sözleşmeyi derhâl feshedebilir.

**12.4** Münhasır yetkide MALİK'in haklı bir sebep olmaksızın süre bitiminden önce sözleşmeyi sona erdirmesinin sonuçları (varsa masraf/tazminat) Özel Şartlar bölümünde açıkça belirtilir; belirtilmemişse genel hükümler uygulanır.

**12.5** Sona erme, Madde 7.2/b kapsamındaki hakları etkilemez.

## Madde 13 — Kişisel Verilerin Korunması

MALİK, kişisel verilerinin 6698 sayılı Kanun kapsamında İŞLETME tarafından veri sorumlusu sıfatıyla işlenmesine ilişkin **KVKK Aydınlatma Metni**'nin kendisine bu sözleşmeden önce/ayrıca sunulduğunu ve okuduğunu beyan eder. Açık rızaya dayalı işlemeler (ticari elektronik ileti, arama kaydı, yurt dışı aktarım vb.) ayrı **Açık Rıza Formu** ile alınır; bu sözleşmenin imzalanması açık rıza verildiği anlamına gelmez.

## Madde 14 — Tebligat

Tarafların Madde 1'de yazılı adres, telefon ve e-posta adresleri tebligat adresidir. Değişiklik yazılı olarak bildirilmedikçe bu adreslere yapılan bildirimler geçerlidir.

## Madde 15 — Uyuşmazlıkların Çözümü

Bu sözleşmeden doğan uyuşmazlıklarda Türk hukuku uygulanır. MALİK'in tüketici olduğu hâllerde parasal sınırlar dâhilinde Tüketici Hakem Heyetleri, bunun üzerinde tüketici mahkemeleri görevlidir; tüketici uyuşmazlıklarında dava açılmadan önce arabulucuya başvurulması dava şartı olabilir (teyit edilmeli). Diğer hâllerde {{yetkili_mahkeme_yeri}} mahkemeleri ve icra daireleri yetkilidir; ilgili dava şartı arabuluculuk hükümleri saklıdır.

## Madde 16 — Özel Şartlar

{{ozel_sartlar}}

## Madde 17 — Yürürlük

Bu sözleşme 17 maddeden ibaret olup {{sozlesme_tarihi}} tarihinde, taraflarca okunarak iki nüsha hâlinde (elektronik imza hâlinde tek elektronik nüsha) imzalanmıştır. Bir nüsha MALİK'e teslim edilmiştir.

| İŞLETME | MALİK | MALİK (2) |
|---|---|---|
| {{isletme_unvani}} | {{malik_ad_soyad}} | {{malik2_ad_soyad}} |
| Yetkili: {{sorumlu_danisman_ad_soyad}} | | |
| İmza / Kaşe: | İmza: | İmza: |

---
*Belge kodu: yetki-sozlesmesi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
