---
baslik: "İşyeri Kira Sözleşmesi"
kod: "isyeri-kira-sozlesmesi"
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
  - kiraya_veren_kimlik_vergi_no
  - kiraya_veren_adres
  - kiraya_veren_iban
  - kiraya_veren_kdv_mukellefi
  - kiraci_unvan
  - kiraci_kimlik_vergi_no
  - kiraci_vergi_dairesi
  - kiraci_adres
  - kiraci_telefon
  - kiraci_stopaj_yukumlusu
  - aylik_net_kira
  - aylik_brut_kira
  - para_birimi
  - kira_odeme_gunu
  - baslangic_tarihi
  - kira_suresi
  - guvence_bedeli
  - kullanim_amaci
  - teslim_tarihi
opsiyonel_alanlar:
  - kiraci_mersis_no
  - kiraci_yetkili_ad_soyad
  - kdv_orani
  - stopaj_orani
  - artis_ek_orani
  - aidat_tutari
  - demirbas_listesi
  - tabela_izni
  - ruhsat_sorumlulugu
  - dask_police_no
  - kefil_ad_soyad
  - kefil_tckn
  - kefalet_azami_tutar
  - isletme_unvani
  - yetki_belgesi_no
  - ozel_sartlar
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 299 vd. ve md. 339 vd. (çatılı işyeri kiraları)"
  - "6098 sayılı Türk Borçlar Kanunu md. 342 (güvence bedeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 344 (kira bedelinin belirlenmesi — TÜFE)"
  - "6098 sayılı Türk Borçlar Kanunu md. 346 (kiracı aleyhine ek yükümlülük yasağı)"
  - "6098 sayılı Türk Borçlar Kanunu md. 347 (10 yıllık uzama süresi)"
  - "193 sayılı Gelir Vergisi Kanunu md. 94 (kira stopajı — oran teyit edilmeli)"
  - "5520 sayılı Kurumlar Vergisi Kanunu md. 15 (kurumlar için stopaj — teyit edilmeli)"
  - "3065 sayılı Katma Değer Vergisi Kanunu (işyeri kiralarında KDV — oran ve istisnalar teyit edilmeli)"
  - "6325 sayılı Kanun md. 18/B (kira uyuşmazlıklarında dava şartı arabuluculuk — teyit edilmeli)"
  - "6305 sayılı Afet Sigortaları Kanunu (DASK)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# İŞYERİ KİRA SÖZLEŞMESİ

## Kira Bilgileri

| Alan | Bilgi |
|---|---|
| Sözleşme tarihi | {{sozlesme_tarihi}} |
| İl / İlçe / Mahalle | {{il}} / {{ilce}} / {{mahalle}} |
| Açık adres | {{tasinmaz_acik_adres}} |
| Ada / Parsel / Bağımsız bölüm | {{ada}} / {{parsel}} / {{bagimsiz_bolum_no}} |
| Kiralananın cinsi | {{kiralananin_cinsi}} (Dükkân / Ofis / Depo / Mağaza vb.) |
| Kiraya veren | {{kiraya_veren_ad_soyad}} — T.C. Kimlik / Vergi No: {{kiraya_veren_kimlik_vergi_no}} |
| Kiraya verenin adresi | {{kiraya_veren_adres}} |
| Kiraya veren KDV mükellefi mi? | {{kiraya_veren_kdv_mukellefi}} |
| Kiracı (unvan) | {{kiraci_unvan}} |
| Kiracı Vergi Dairesi / Vergi No | {{kiraci_vergi_dairesi}} / {{kiraci_kimlik_vergi_no}} |
| Kiracı MERSİS No | {{kiraci_mersis_no}} |
| Kiracı yetkilisi | {{kiraci_yetkili_ad_soyad}} |
| Kiracının adresi / telefonu | {{kiraci_adres}} / {{kiraci_telefon}} |
| Kiracı stopaj (tevkifat) yükümlüsü mü? | {{kiraci_stopaj_yukumlusu}} |
| Aylık net kira | {{aylik_net_kira}} {{para_birimi}} |
| Aylık brüt kira | {{aylik_brut_kira}} {{para_birimi}} |
| Stopaj oranı | %{{stopaj_orani}} |
| KDV oranı (uygulanıyorsa) | %{{kdv_orani}} |
| Ödeme günü | Her ayın {{kira_odeme_gunu}}. günü, peşin — IBAN: {{kiraya_veren_iban}} |
| Başlangıç tarihi / Süre | {{baslangic_tarihi}} / {{kira_suresi}} |
| Güvence bedeli | {{guvence_bedeli}} {{para_birimi}} |
| Kullanım amacı | {{kullanim_amaci}} |
| Aylık aidat (bilgi amaçlı) | {{aidat_tutari}} |
| Teslim tarihi | {{teslim_tarihi}} |
| DASK poliçe no | {{dask_police_no}} |
| Aracı işletme (varsa) | {{isletme_unvani}} — Yetki Belgesi No: {{yetki_belgesi_no}} |

## Demirbaşlar

{{demirbas_listesi}}

*Ayrıntılı liste ve fotoğraflar Anahtar ve Demirbaş Teslim Tutanağı'ndadır.*

---

## GENEL ŞARTLAR

**1. Kullanım amacı.** Kiralanan yalnızca yukarıda belirtilen **{{kullanim_amaci}}** amacıyla kullanılabilir. Kullanım amacının değiştirilmesi kiraya verenin yazılı iznine bağlıdır. Faaliyetin gerektirdiği işyeri açma ve çalışma ruhsatı, yangın uygunluk belgesi ve diğer izinlerin alınması {{ruhsat_sorumlulugu}} sorumluluğundadır. Kiraya veren, kiralananın yapı kullanma izni ve imar durumu bakımından bu faaliyete elverişli olduğuna ilişkin bildiği hususları kiracıya açıklamıştır.

**2. Stopaj (gelir vergisi tevkifatı).** Kiracı, Gelir Vergisi Kanunu md. 94 kapsamında tevkifat yapmakla yükümlü ise (tüccar, serbest meslek erbabı, kurumlar vb.), kiraya verenin gerçek kişi olduğu hâllerde brüt kira üzerinden yürürlükteki oranda (halen %20 — teyit edilmeli) stopaj keserek vergi dairesine beyan eder ve öder; kiraya verene net kirayı öder. Tarafların üzerinde anlaştığı kira bedelinin **net mi brüt mü** olduğu yukarıdaki tabloda açıkça gösterilmiştir. Kiraya verenin KDV mükellefi bir şirket olması hâlinde stopaj uygulanmayabilir; vergisel nitelendirme mali müşavirce teyit edilmelidir.

**3. KDV.** Kiraya veren işyeri kiralamasını ticari faaliyeti kapsamında yapıyorsa veya KDV mükellefiyse kira bedeline yürürlükteki oranda KDV eklenir ve fatura düzenlenir. Kiraya verenin KDV mükellefi olmayan gerçek kişi olması hâlinde KDV uygulanmayabilir (teyit edilmeli).

**4. Kira artışı.** Kira bedeli her kira yılı başında, bir önceki kira yılında TÜİK tarafından ilan edilen **tüketici fiyat endeksindeki on iki aylık ortalamalara göre değişim oranında** artırılır; taraflar bu oranı aşan bir artış kararlaştıramaz (TBK md. 344/1). {{artis_ek_orani}} *(Bu alana TÜFE'yi aşan ek bir artış yazılamaz; uygulama kontrol eder.)* Beş yıldan sonra kira bedeli TBK md. 344/3 uyarınca hâkimce belirlenebilir. Yabancı para cinsinden kira bedeli kararlaştırılmasına ilişkin TBK md. 344/4 ve 32 sayılı Karar kapsamındaki kısıtlamalar saklıdır (teyit edilmeli).

**5. Güvence bedeli.** Güvence bedeli üç aylık kira bedelini aşamaz ve TBK md. 342'de öngörülen şekilde bankaya yatırılır.

**6. Yan giderler.** Elektrik, su, doğalgaz, telefon/internet ve faaliyetle ilgili vergi, resim ve harçlar kiracıya; emlak vergisi ve esaslı onarım giderleri kiraya verene aittir. Yönetim planına göre belirlenen aidat ve işletme giderleri kiracıya aittir.

**7. Tadilat ve tabela.** Kiracı, kiraya verenin yazılı izni olmadan kiralananda değişiklik yapamaz. Tabela asılması: {{tabela_izni}} (yönetim planı ve belediye izinleri saklıdır). Sözleşme sonunda kiracı, aksi kararlaştırılmadıkça kiralananı eski hâline getirir.

**8. Alt kira ve devir.** Kiracı kiralananı kiraya verenin yazılı rızası olmadan başkasına kiralayamaz. İşyeri kiralarında kira ilişkisinin devri TBK md. 323 uyarınca kiraya verenin yazılı rızasına bağlıdır; kiraya veren haklı sebep olmadıkça bu rızayı vermekten kaçınamaz.

**9. Temerrüt ve fesih.** Kira bedelinin ödenmemesi hâlinde TBK md. 315 uygulanır (çatılı işyerlerinde en az otuz gün süre). Kiracı aleyhine kira bedeli ve yan giderler dışında ek ödeme, muacceliyet veya ceza koşulu öngören hükümler TBK md. 346 uyarınca geçersiz olabilir (işyeri kiralarında uygulanma koşulları teyit edilmeli).

**10. Uzama ve 10 yıllık süre.** TBK md. 347 uyarınca kiracı süre bitiminden en az 15 gün önce bildirimde bulunmadıkça sözleşme aynı koşullarla bir yıl uzar. On yıllık uzama süresi sonunda kiraya veren, izleyen her uzama yılının bitiminden en az üç ay önce bildirimde bulunarak sebep göstermeksizin sözleşmeyi sona erdirebilir.

**11. Tahliye.** TBK md. 350-352'deki tahliye sebepleri saklıdır. Tahliye taahhüdü kiralananın tesliminden sonra ayrı belge ile alınmalıdır.

**12. Sigorta.** DASK poliçesi malik olan kiraya verenin yükümlülüğündedir. Kiracı, kendi emtia, demirbaş ve üçüncü şahıs mali sorumluluk risklerini sigortalamayı kabul eder.

**13. Uyuşmazlık.** Kira uyuşmazlıklarında dava açılmadan önce arabulucuya başvurulması dava şartıdır (teyit edilmeli). Kiralananın bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.

**14. Kefalet.** Kefalet, TBK md. 583-584'teki şekil şartlarına uygun olarak kefilin el yazısıyla azami tutar ve tarih belirtilerek verilir.
Kefil: {{kefil_ad_soyad}} — T.C. Kimlik No: {{kefil_tckn}} — Azami tutar: {{kefalet_azami_tutar}}

**15. Kişisel veriler.** Taraflara KVKK aydınlatma metni ayrıca sunulmuştur.

---

## ÖZEL ŞARTLAR

{{ozel_sartlar}}

---

Bu sözleşme {{sozlesme_tarihi}} tarihinde iki nüsha olarak düzenlenmiş ve imzalanmıştır.

| KİRAYA VEREN | KİRACI (Kaşe/İmza) | KEFİL |
|---|---|---|
| {{kiraya_veren_ad_soyad}} | {{kiraci_unvan}} | {{kefil_ad_soyad}} |
| İmza: | İmza: | İmza: |

---
*Belge kodu: isyeri-kira-sozlesmesi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
