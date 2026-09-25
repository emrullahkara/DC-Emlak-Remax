---
baslik: "Kapora / Ön Satış Protokolü"
kod: "kapora-on-protokol"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - protokol_no
  - protokol_tarihi
  - satici_ad_soyad
  - satici_tckn
  - satici_adres
  - satici_telefon
  - alici_ad_soyad
  - alici_tckn
  - alici_adres
  - alici_telefon
  - il
  - ilce
  - mahalle
  - ada
  - parsel
  - bagimsiz_bolum_no
  - tapu_turu
  - satis_bedeli
  - satis_bedeli_yazi
  - para_birimi
  - kapora_tutari
  - kapora_niteligi
  - kapora_odeme_tarihi
  - kapora_alici_hesap
  - kalan_bedel
  - tapu_devir_tarihi
  - kredi_kullanimi
  - takyidat_beyani
  - teslim_tarihi
  - isletme_unvani
  - yetki_belgesi_no
opsiyonel_alanlar:
  - satici2_ad_soyad
  - satici2_tckn
  - alici2_ad_soyad
  - alici2_tckn
  - blok
  - kat
  - kredi_tutari
  - kredi_banka
  - kredi_onay_son_tarih
  - ipotek_alacaklisi
  - ipotek_tutari
  - demirbaslar
  - tapu_harci_paylasimi
  - ozel_sartlar
  - yetkili_mahkeme_yeri
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 177 (bağlanma parası) ve md. 178 (cayma parası) — madde eşleşmesi teyit edilmeli"
  - "6098 sayılı Türk Borçlar Kanunu md. 237 (taşınmaz satışında resmî şekil)"
  - "4721 sayılı Türk Medeni Kanunu md. 706 ve 2644 sayılı Tapu Kanunu md. 26 (resmî şekil)"
  - "1512 sayılı Noterlik Kanunu md. 60 (satış vaadi sözleşmesi — teyit edilmeli)"
  - "492 sayılı Harçlar Kanunu (tapu harcı)"
  - "6305 sayılı Afet Sigortaları Kanunu (DASK zorunluluğu)"
  - "5549 sayılı Kanun ve ilgili yönetmelik (müşteriyi tanıma, banka kanalıyla ödeme — teyit edilmeli)"
  - "Taşınmaz Ticareti Hakkında Yönetmelik (hizmet bedeli)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# KAPORA / ÖN SATIŞ PROTOKOLÜ

**Protokol No:** {{protokol_no}} — **Tarih:** {{protokol_tarihi}}

> **ÖNEMLİ UYARI:** Türk hukukunda taşınmaz satış sözleşmesi ve satış vaadi sözleşmesi **resmî şekle** tabidir (tapu müdürlüğünde veya noterde düzenlenmelidir). Bu protokol adi yazılı şekilde düzenlendiğinden tarafları **tapuda devir yapmaya zorlayan bir satış veya satış vaadi sözleşmesi değildir**. Protokol; tarafların niyetini, ödenen kaporanın niteliğini ve akıbetini, tapu devir takvimini belgelemek amacı taşır. Kaporanın akıbetine ilişkin hükümlerin geçerliliği, şekil eksikliği karşısında sınırlı kalabilir (teyit edilmeli). Tarafların bağlayıcı bir taahhüt istemesi hâlinde noterde **düzenleme şeklinde satış vaadi sözleşmesi** yapılması tavsiye edilir.

## Madde 1 — Taraflar

**Satıcı:** {{satici_ad_soyad}}, T.C. Kimlik No: {{satici_tckn}}, Adres: {{satici_adres}}, Tel: {{satici_telefon}}
**Satıcı (2):** {{satici2_ad_soyad}}, T.C. Kimlik No: {{satici2_tckn}}

**Alıcı:** {{alici_ad_soyad}}, T.C. Kimlik No: {{alici_tckn}}, Adres: {{alici_adres}}, Tel: {{alici_telefon}}
**Alıcı (2):** {{alici2_ad_soyad}}, T.C. Kimlik No: {{alici2_tckn}}

**Aracı İşletme:** {{isletme_unvani}} (Yetki Belgesi No: {{yetki_belgesi_no}})

## Madde 2 — Taşınmaz

{{il}} İli, {{ilce}} İlçesi, {{mahalle}} Mahallesi, **{{ada}} ada {{parsel}} parsel**, {{blok}} Blok, {{kat}}. Kat, **{{bagimsiz_bolum_no}} no.lu bağımsız bölüm**; tapu türü: {{tapu_turu}}.

Satışa dâhil demirbaşlar: {{demirbaslar}}

## Madde 3 — Satış Bedeli

Taraflar, taşınmazın satış bedelini **{{satis_bedeli}} {{para_birimi}} ({{satis_bedeli_yazi}})** olarak kararlaştırmıştır.

Tapuda beyan edilecek değer, gerçek satış bedelinden düşük gösterilmeyecektir. Taraflar, gerçek bedelin altında beyanın vergi ve harç mevzuatı bakımından cezai sonuçlar doğurabileceği konusunda bilgilendirilmiştir.

## Madde 4 — Kapora

**4.1** Alıcı, **{{kapora_tutari}} {{para_birimi}}** tutarındaki kaporayı **{{kapora_odeme_tarihi}}** tarihinde, satıcının **{{kapora_alici_hesap}}** numaralı banka hesabına (IBAN) ödemiştir / ödeyecektir. Kapora nakit olarak ödenmez.

**4.2 Kaporanın niteliği:** {{kapora_niteligi}}

- [ ] **Bağlanma parası (TBK md. 177 — teyit edilmeli):** Kapora, sözleşmenin kurulduğunun delilidir; tapu devrinde satış bedelinden mahsup edilir. Aksi kararlaştırılmadıkça taraflara cayma hakkı vermez.
  - Satıcı kaynaklı sebeple devir gerçekleşmezse: Satıcı aldığı kaporayı **iade eder**; Alıcı'nın ayrıca uğradığı zararın tazminini isteme hakkı saklıdır.
  - Alıcı kaynaklı sebeple devir gerçekleşmezse: Satıcı kaporayı **alıkoyabilir**; zararının kaporayı aşan kısmını ispat hâlinde isteyebilir.
- [ ] **Cayma parası (TBK md. 178 — teyit edilmeli):** Taraflar cayma hakkı tanır. Kaporayı veren Alıcı caymak isterse **kaporayı kaybeder**; kaporayı alan Satıcı caymak isterse **aldığı kaporanın iki katını** (kaporayı iade + aynı tutarı ödeme) öder. Cayma parası, tarafların cayma karşılığı ödeyecekleri tüm bedeli oluşturur.

**4.3** Aracı işletme kapora tutarını emanet olarak kabul etmez; kapora doğrudan satıcıya banka kanalıyla ödenir. (Ofis politikası emanet hesabı öngörüyorsa bu madde hukuk danışmanıyla yeniden düzenlenmelidir.)

**4.4** Kaporanın akıbetine ilişkin yukarıdaki hükümlerin, resmî şekle uygun olmayan bir protokolde ne ölçüde uygulanacağı ve sebepsiz zenginleşme hükümlerine göre iade talebi riski hukuk danışmanınca değerlendirilmelidir (teyit edilmeli).

## Madde 5 — Ödeme Planı ve Ödeme Şekli

**5.1** Kalan bedel **{{kalan_bedel}} {{para_birimi}}**, tapu devri sırasında ödenecektir.

**5.2** Tüm ödemeler **banka kanalıyla** (EFT/havale, bankanın güvenli ödeme sistemi veya tapu müdürlüğü ile entegre güvenli ödeme hizmeti) yapılır; ödemenin açıklamasına taşınmazın ada/parsel bilgisi yazılır. Taşınmaz satışlarında ödemelerin banka aracılığıyla yapılması ve belgelenmesine ilişkin mevzuat hükümleri saklıdır (tutar eşikleri ve dayanak teyit edilmeli).

**5.3** Yabancı para üzerinden anlaşılmış olsa bile Türkiye'de yerleşik kişiler arasındaki taşınmaz satışlarında bedelin Türk lirası olarak belirlenmesi zorunluluğuna ilişkin (Türk Parası Kıymetini Koruma Hakkında 32 sayılı Karar) hükümler saklıdır (teyit edilmeli).

## Madde 6 — Tapu Devri

**6.1** Tapu devri en geç **{{tapu_devir_tarihi}}** tarihinde, Web Tapu üzerinden alınacak randevu ile yapılacaktır.

**6.2** Tapu harcı 492 sayılı Harçlar Kanunu uyarınca alıcı ve satıcı tarafından ayrı ayrı ödenir (güncel oran — halen her bir taraf için binde 20 — teyit edilmeli). Taraflar arasında farklı paylaşım kararlaştırıldıysa: {{tapu_harci_paylasimi}}. Döner sermaye bedeli alıcıya aittir (aksi kararlaştırılmadıkça).

**6.3** Satıcı, tapu devrinden önce geçerli **DASK poliçesini** (6305 sayılı Kanun), emlak vergisi borcu yoktur yazısını ve varsa site yönetiminden aidat borcu yoktur yazısını temin eder.

**6.4** Taşınmazın fiilî teslimi **{{teslim_tarihi}}** tarihinde, Anahtar ve Demirbaş Teslim Tutanağı düzenlenerek yapılır.

## Madde 7 — Kredi Şartı

Alıcı konut kredisi kullanacak mı: **{{kredi_kullanimi}}**

Kredi kullanılacaksa: Banka: {{kredi_banka}}, Tutar: {{kredi_tutari}} {{para_birimi}}.

- Satıcı, ekspertiz için taşınmazı göstermeyi ve banka işlemleri için gerekli belgeleri sağlamayı kabul eder.
- Alıcı'nın kusuru olmaksızın kredi başvurusunun **{{kredi_onay_son_tarih}}** tarihine kadar reddedilmesi veya ekspertiz değerinin yetersiz kalması hâlinde, Alıcı bu durumu belgelemek kaydıyla protokolden cayabilir ve **kapora Alıcı'ya tam olarak iade edilir**. Bu hâlde Madde 4.2'deki cayma hükümleri uygulanmaz.
- Alıcı'nın kredi başvurusunu yapmaması, eksik belge vermesi gibi kendi kusuruyla kredinin kullanılamaması hâlinde Madde 4.2 hükümleri uygulanır.

## Madde 8 — Takyidat Beyanı

Satıcı, protokol tarihi itibarıyla taşınmaz üzerindeki takyidatlara ilişkin aşağıdaki beyanı verir ve Alıcı'ya güncel tapu kaydı (TAKBİS) çıktısının gösterildiğini kabul eder:

{{takyidat_beyani}}

Varsa ipotek: Alacaklı {{ipotek_alacaklisi}}, Tutar {{ipotek_tutari}}. Satıcı, ipoteği en geç tapu devri anında kaldırmayı (kalan bedelden kapatma yoluyla dâhil) taahhüt eder.

Satıcı, beyan edilmeyen bir haciz, ihtiyati tedbir, şerh veya ipotek nedeniyle devrin yapılamaması hâlinde bunun Satıcı kaynaklı sebep sayılacağını kabul eder.

## Madde 9 — Hizmet Bedeli

Aracı işletmenin hizmet bedeli, taraflarla ayrı ayrı imzalanan yetki sözleşmesi / yer gösterme belgesi uyarınca tapu devri anında ödenir. Protokolün Madde 7 kapsamında sona ermesi hâlinde hizmet bedeli doğmaz.

## Madde 10 — Özel Şartlar

{{ozel_sartlar}}

## Madde 11 — Uyuşmazlık

Uyuşmazlıklarda {{yetkili_mahkeme_yeri}} mahkemeleri ve icra daireleri yetkilidir. Tüketici sıfatını taşıyan taraflar bakımından tüketici mevzuatının görev ve yetki kuralları ile dava şartı arabuluculuk hükümleri saklıdır (teyit edilmeli).

Bu protokol {{protokol_tarihi}} tarihinde üç nüsha olarak düzenlenmiş ve imzalanmıştır.

| SATICI | ALICI | ARACI İŞLETME (bilgi ve tanık sıfatıyla) |
|---|---|---|
| {{satici_ad_soyad}} | {{alici_ad_soyad}} | {{isletme_unvani}} |
| İmza: | İmza: | İmza / Kaşe: |

---
*Belge kodu: kapora-on-protokol · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
