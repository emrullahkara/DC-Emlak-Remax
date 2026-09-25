---
baslik: "Konut Kira Sözleşmesi"
kod: "konut-kira-sozlesmesi"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - sozlesme_tarihi
  - il
  - ilce
  - mahalle
  - tasinmaz_acik_adres
  - ada
  - parsel
  - bagimsiz_bolum_no
  - kiralananin_cinsi
  - kiraya_veren_ad_soyad
  - kiraya_veren_tckn
  - kiraya_veren_adres
  - kiraya_veren_iban
  - kiraci_ad_soyad
  - kiraci_tckn
  - kiraci_adres
  - kiraci_telefon
  - aylik_kira
  - yillik_kira
  - para_birimi
  - kira_odeme_gunu
  - kira_odeme_sekli
  - baslangic_tarihi
  - kira_suresi
  - guvence_bedeli
  - kiralananin_durumu
  - kullanim_amaci
  - aidat_tutari
  - teslim_tarihi
opsiyonel_alanlar:
  - kiraya_veren_temsilci
  - kefil_ad_soyad
  - kefil_tckn
  - kefil_adres
  - kefalet_azami_tutar
  - kefalet_suresi
  - guvence_bedeli_yatirilan_banka
  - demirbas_listesi
  - dask_police_no
  - dask_bitis_tarihi
  - evcil_hayvan_izni
  - isletme_unvani
  - yetki_belgesi_no
  - ozel_sartlar
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 299 vd. (kira sözleşmesi genel hükümler)"
  - "6098 sayılı Türk Borçlar Kanunu md. 339 vd. (konut ve çatılı işyeri kiraları)"
  - "6098 sayılı Türk Borçlar Kanunu md. 342 (güvence bedeli — en fazla 3 aylık kira)"
  - "6098 sayılı Türk Borçlar Kanunu md. 344 (kira bedelinin belirlenmesi — 12 aylık TÜFE ortalaması)"
  - "6098 sayılı Türk Borçlar Kanunu md. 347 (10 yıllık uzama süresi)"
  - "6098 sayılı Türk Borçlar Kanunu md. 350-352 (tahliye sebepleri, tahliye taahhüdü)"
  - "6098 sayılı Türk Borçlar Kanunu md. 581 vd. (kefalet — şekil şartları)"
  - "634 sayılı Kat Mülkiyeti Kanunu (ortak giderler — ilgili maddeler teyit edilmeli)"
  - "6305 sayılı Afet Sigortaları Kanunu (DASK)"
  - "6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu md. 18/B (kira uyuşmazlıklarında dava şartı arabuluculuk — teyit edilmeli)"
  - "488 sayılı Damga Vergisi Kanunu (kira sözleşmesi damga vergisi — oran teyit edilmeli)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# KONUT KİRA SÖZLEŞMESİ

## Kira Bilgileri

| Alan | Bilgi |
|---|---|
| Sözleşme tarihi | {{sozlesme_tarihi}} |
| İl / İlçe / Mahalle | {{il}} / {{ilce}} / {{mahalle}} |
| Açık adres | {{tasinmaz_acik_adres}} |
| Ada / Parsel / Bağımsız bölüm | {{ada}} / {{parsel}} / {{bagimsiz_bolum_no}} |
| Kiralananın cinsi | {{kiralananin_cinsi}} (Daire / Müstakil konut / Rezidans vb.) |
| Kiraya veren | {{kiraya_veren_ad_soyad}} — T.C. Kimlik No: {{kiraya_veren_tckn}} |
| Kiraya verenin adresi | {{kiraya_veren_adres}} |
| Kiraya veren temsilcisi (varsa) | {{kiraya_veren_temsilci}} |
| Kiracı | {{kiraci_ad_soyad}} — T.C. Kimlik No: {{kiraci_tckn}} |
| Kiracının adresi / telefonu | {{kiraci_adres}} / {{kiraci_telefon}} |
| Aylık kira bedeli | {{aylik_kira}} {{para_birimi}} |
| Yıllık kira bedeli | {{yillik_kira}} {{para_birimi}} |
| Kiranın ödeme günü | Her ayın {{kira_odeme_gunu}}. günü, peşin |
| Kiranın ödeme şekli | {{kira_odeme_sekli}} — IBAN: {{kiraya_veren_iban}} |
| Kira başlangıç tarihi | {{baslangic_tarihi}} |
| Kira süresi | {{kira_suresi}} |
| Güvence bedeli (depozito) | {{guvence_bedeli}} {{para_birimi}} |
| Kiralananın bugünkü durumu | {{kiralananin_durumu}} |
| Kullanım amacı | {{kullanim_amaci}} (Mesken) |
| Aylık aidat (bilgi amaçlı) | {{aidat_tutari}} |
| Teslim tarihi | {{teslim_tarihi}} |
| DASK poliçe no / bitiş | {{dask_police_no}} / {{dask_bitis_tarihi}} |
| Aracı işletme (varsa) | {{isletme_unvani}} — Yetki Belgesi No: {{yetki_belgesi_no}} |

## Kiralananla Birlikte Teslim Edilen Demirbaşlar

{{demirbas_listesi}}

*Demirbaşların ayrıntılı listesi, durumu ve fotoğrafları, bu sözleşmenin eki olan **Anahtar ve Demirbaş Teslim Tutanağı**'nda yer alır.*

---

## GENEL ŞARTLAR

**1. Kiralananın kullanımı.** Kiracı, kiralananı sözleşmede belirtilen amaca uygun olarak ve özenle kullanmak, komşulara ve bina sakinlerine saygı göstermekle yükümlüdür (TBK md. 316).

**2. Teslim.** Kiraya veren, kiralananı kararlaştırılan tarihte, kullanıma elverişli şekilde ve teslim tutanağında belirtilen durumda teslim eder. Teslim anındaki durum, sayaç endeksleri ve demirbaşlar teslim tutanağı ile kayıt altına alınır.

**3. Kiranın ödenmesi.** Kira bedeli, yukarıda belirtilen banka hesabına her ay peşin ödenir. Ödemenin banka kanalıyla yapılması, kira gelirlerinin belgelenmesine ilişkin vergi mevzuatı bakımından da gereklidir (tutar eşiği ve dayanak teyit edilmeli).

**4. Kira artışı.** Kira bedeli her kira yılı başında yenilenir. Yenilenen kira yılında uygulanacak artış oranı, **bir önceki kira yılında Türkiye İstatistik Kurumu tarafından ilan edilen tüketici fiyat endeksindeki on iki aylık ortalamalara göre değişim oranını geçemez** (TBK md. 344/1). Taraflar bu sınırın altında bir artış oranı kararlaştırabilir. Beş yıldan uzun süreli veya beş yıldan sonra yenilenen sözleşmelerde kira bedeli, TBK md. 344/3 uyarınca hâkim tarafından hakkaniyete göre belirlenebilir. (Konut kiralarında 11.06.2022 tarihinden itibaren uygulanan geçici %25 sınırı Temmuz 2024 itibarıyla sona ermiştir — tarihler teyit edilmeli.)

**5. Güvence bedeli.** Kiracının ödediği güvence bedeli **üç aylık kira bedelini aşamaz** (TBK md. 342). Güvence bedeli para olarak verilmişse, kiraya verenin onayı olmadan çekilmemek üzere vadeli bir tasarruf hesabına yatırılır; kıymetli evrak olarak verilmişse bir bankaya depo edilir. Banka, güvence bedelini ancak iki tarafın rızası, icra takibinin kesinleşmesi veya mahkeme kararı ile geri verebilir. Kiracı, kira sözleşmesinin sona ermesinden itibaren üç ay içinde kiraya verenin kendisine karşı kira sözleşmesiyle ilgili bir dava açtığını veya icra takibi yaptığını bankaya bildirmezse, banka kiracının istemi üzerine güvence bedelini geri verir (TBK md. 342 — ayrıntılar teyit edilmeli). Güvence bedelinin yatırıldığı banka: {{guvence_bedeli_yatirilan_banka}}

**6. Yan giderler ve ortak giderler.** Kiralananın elektrik, su, doğalgaz, internet vb. abonelikleri kiracı adına açılır ve bu giderler kiracıya aittir. Yönetim planına göre belirlenen aidat ve işletme giderleri kiracı tarafından ödenir. Binanın esaslı onarımı, yenilenmesi ve yatırım niteliğindeki giderleri (asansör yenileme, çatı, cephe yalıtımı vb.) kiraya verene aittir. Kat Mülkiyeti Kanunu uyarınca ortak gider borcundan kiracı ile kat malikinin sorumluluğuna ilişkin hükümler saklıdır (teyit edilmeli).

**7. Bakım ve onarım.** Kiracı, kiralananın olağan kullanımı için gerekli temizlik ve küçük bakım giderlerini karşılar. Diğer ayıpları kiraya verene gecikmeksizin bildirir. Kiraya veren, kiralananı sözleşme süresince kullanıma elverişli durumda bulundurmakla yükümlüdür (TBK md. 301).

**8. Değişiklik ve tadilat.** Kiracı, kiraya verenin yazılı rızası olmadan kiralananda yenilik ve değişiklik yapamaz (TBK md. 321).

**9. Alt kira ve devir.** Kiracı, kiraya verenin yazılı rızası olmaksızın kiralananı başkasına kiralayamaz, kullanım hakkını devredemez (TBK md. 322).

**10. Kiralananın gezilmesi.** Kiraya veren, kiralananın bakımı, satılması veya sonraki kiralanması için gerekli olduğu ölçüde, önceden bildirmek ve uygun bir zamanda olmak kaydıyla kiralananı gezip görebilir (TBK md. 318 — teyit edilmeli).

**11. Kiracının temerrüdü.** Kiracı kira bedelini ödemezse kiraya veren, kiracıya yazılı olarak en az otuz günlük süre vererek bu süre içinde ödeme yapılmadığı takdirde sözleşmeyi feshedeceğini bildirebilir (TBK md. 315). Bir kira yılı içinde iki haklı ihtara sebep olunması, TBK md. 352/2 uyarınca tahliye sebebidir.

**12. Sözleşmenin uzaması ve 10 yıllık uzama süresi.** Kiracı, belirli süreli sözleşmenin bitiminden en az **on beş gün önce** bildirimde bulunmadıkça sözleşme aynı koşullarla **bir yıl** uzar. Kiraya veren, sözleşme süresinin bitimine dayanarak sözleşmeyi sona erdiremez. Ancak **on yıllık uzama süresi** sonunda kiraya veren, bu süreyi izleyen her uzama yılının bitiminden en az üç ay önce bildirimde bulunmak koşuluyla, herhangi bir sebep göstermeksizin sözleşmeye son verebilir (TBK md. 347). *Uygulama, on yıllık uzama süresinin dolacağı tarihi ve bildirim son gününü hatırlatıcı olarak kaydeder.*

**13. Tahliye.** Kiraya veren; gereksinim, yeniden inşa/imar, yeni malikin gereksinimi, tahliye taahhüdü ve iki haklı ihtar gibi kanunda sayılan sebeplerle kira sözleşmesini sona erdirebilir (TBK md. 350-352). **Tahliye taahhütnamesi bu sözleşme ile birlikte alınamaz;** geçerli olabilmesi için kiralananın tesliminden sonra, ayrı bir belge olarak ve yazılı şekilde düzenlenmesi gerekir (bkz. Tahliye Taahhütnamesi şablonu).

**14. Kiralananın geri verilmesi.** Kiracı, sözleşmenin sona ermesinde kiralananı teslim aldığı durumda, olağan kullanımdan doğan yıpranmalar dışında eksiksiz olarak ve teslim tutanağındaki demirbaşlarla birlikte geri verir. Geri verme de tutanakla kayıt altına alınır.

**15. DASK ve sigorta.** Zorunlu deprem sigortası (DASK) poliçesinin yaptırılması ve yenilenmesi malik olan kiraya verenin yükümlülüğündedir (6305 sayılı Kanun). Kiracının kendi eşyası için konut/eşya sigortası yaptırması tavsiye edilir.

**16. Kefalet.** Kefil gösterilmişse kefalet, TBK md. 583 uyarınca kefilin **sorumlu olacağı azami miktarı ve kefalet tarihini** kefilin kendi el yazısıyla belirtmesi ile geçerlidir; eşli kefiller için eşin yazılı rızası gerekir (TBK md. 584 — istisnalar teyit edilmeli). Elektronik ortamda kefalet alınamayabileceği hususu hukuk danışmanınca değerlendirilmelidir.

Kefil: {{kefil_ad_soyad}}, T.C. Kimlik No: {{kefil_tckn}}, Adres: {{kefil_adres}}
Azami sorumluluk tutarı (kefilin el yazısıyla): {{kefalet_azami_tutar}} — Kefalet süresi: {{kefalet_suresi}}

**17. Tebligat.** Tarafların bu sözleşmede yazılı adresleri tebligat adresidir. Kiracının tebligat adresi, aksi bildirilmedikçe kiralananın adresidir.

**18. Damga vergisi.** Sözleşmeden doğan damga vergisi, aksi kararlaştırılmadıkça taraflarca yarı yarıya ödenir (oran ve yükümlülük teyit edilmeli).

**19. Uyuşmazlık.** Kira ilişkisinden doğan uyuşmazlıklarda dava açılmadan önce arabulucuya başvurulması dava şartıdır (6325 sayılı Kanun md. 18/B — teyit edilmeli). Kiralananın bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.

**20. Kişisel veriler.** Taraflar, kişisel verilerinin sözleşmenin kurulması ve ifası amacıyla işlenmesine ilişkin aydınlatma metinlerinin kendilerine sunulduğunu beyan eder.

---

## ÖZEL ŞARTLAR

1. Evcil hayvan: {{evcil_hayvan_izni}}
2. {{ozel_sartlar}}

*Özel şartlar, kanunun emredici hükümlerine (özellikle TBK md. 339 vd. konut kiralarına ilişkin kiracı lehine düzenlemelere) aykırı olamaz. Kiracı aleyhine kararlaştırılan, kira bedeli dışında ek ödeme yükümlülüğü, muacceliyet koşulu veya ceza koşulu gibi hükümler TBK md. 346 uyarınca geçersizdir (teyit edilmeli).*

---

Bu sözleşme, Genel ve Özel Şartlar ile ekleri (Anahtar ve Demirbaş Teslim Tutanağı, kimlik suretleri) birlikte bir bütündür. {{sozlesme_tarihi}} tarihinde iki nüsha olarak düzenlenmiş ve imzalanmıştır.

| KİRAYA VEREN | KİRACI | KEFİL |
|---|---|---|
| {{kiraya_veren_ad_soyad}} | {{kiraci_ad_soyad}} | {{kefil_ad_soyad}} |
| İmza: | İmza: | İmza: |

---
*Belge kodu: konut-kira-sozlesmesi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
