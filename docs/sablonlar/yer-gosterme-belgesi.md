---
baslik: "Yer Gösterme Belgesi"
kod: "yer-gosterme-belgesi"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - belge_no
  - isletme_unvani
  - yetki_belgesi_no
  - isletme_adres
  - isletme_telefon
  - danisman_ad_soyad
  - danisman_yetki_belgesi_no
  - gosterilen_ad_soyad
  - gosterilen_tckn
  - gosterilen_telefon
  - gosterim_tarihi
  - gosterim_saati
  - tasinmaz_1_portfoy_no
  - tasinmaz_1_adres
  - tasinmaz_1_ada_parsel
  - tasinmaz_1_islem_turu
  - tasinmaz_1_fiyat
  - hizmet_bedeli_orani
  - hizmet_bedeli_kira_ay
  - koruma_suresi_ay
  - imza_yontemi
  - zaman_damgasi
opsiyonel_alanlar:
  - gosterilen_adres
  - gosterilen_eposta
  - gosterilen_temsil_ettigi_kisi
  - tasinmaz_2_portfoy_no
  - tasinmaz_2_adres
  - tasinmaz_2_ada_parsel
  - tasinmaz_2_islem_turu
  - tasinmaz_2_fiyat
  - tasinmaz_3_portfoy_no
  - tasinmaz_3_adres
  - tasinmaz_3_ada_parsel
  - tasinmaz_3_islem_turu
  - tasinmaz_3_fiyat
  - otp_dogrulama_kodu_ref
  - otp_telefon_maskeli
  - konum_enlem
  - konum_boylam
  - konum_dogruluk_m
  - cihaz_bilgisi
  - belge_ozet_degeri
  - notlar
dayanak:
  - "Taşınmaz Ticareti Hakkında Yönetmelik (yer gösterme belgesi ve hizmet bedeli hükümleri — madde numaraları teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 520 vd. (simsarlık — teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 179-182 (ceza koşulu)"
  - "5070 sayılı Elektronik İmza Kanunu (nitelikli e-imza kullanılırsa)"
  - "6698 sayılı Kişisel Verilerin Korunması Kanunu md. 10"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# YER GÖSTERME BELGESİ

**Belge No:** {{belge_no}}

## 1. Yetkili İşletme

| Alan | Bilgi |
|---|---|
| Ticaret unvanı | {{isletme_unvani}} |
| Yetki Belgesi No | {{yetki_belgesi_no}} |
| Adres / Telefon | {{isletme_adres}} / {{isletme_telefon}} |
| Yer gösteren danışman | {{danisman_ad_soyad}} (Yetki Belgesi No: {{danisman_yetki_belgesi_no}}) |

## 2. Taşınmaz Gösterilen Kişi

| Alan | Bilgi |
|---|---|
| Ad Soyad / Unvan | {{gosterilen_ad_soyad}} |
| T.C. Kimlik No / Vergi No | {{gosterilen_tckn}} |
| Telefon / E-posta | {{gosterilen_telefon}} / {{gosterilen_eposta}} |
| Adres | {{gosterilen_adres}} |
| Başkası adına hareket ediyorsa temsil edilen kişi | {{gosterilen_temsil_ettigi_kisi}} |

## 3. Gösterim Tarihi ve Saati

Tarih: **{{gosterim_tarihi}}** — Saat: **{{gosterim_saati}}**

## 4. Gösterilen Taşınmazlar

| # | Portföy No | Adres (il/ilçe/mahalle, blok/kat) | Ada / Parsel / BB | İşlem | İlan Fiyatı |
|---|---|---|---|---|---|
| 1 | {{tasinmaz_1_portfoy_no}} | {{tasinmaz_1_adres}} | {{tasinmaz_1_ada_parsel}} | {{tasinmaz_1_islem_turu}} | {{tasinmaz_1_fiyat}} |
| 2 | {{tasinmaz_2_portfoy_no}} | {{tasinmaz_2_adres}} | {{tasinmaz_2_ada_parsel}} | {{tasinmaz_2_islem_turu}} | {{tasinmaz_2_fiyat}} |
| 3 | {{tasinmaz_3_portfoy_no}} | {{tasinmaz_3_adres}} | {{tasinmaz_3_ada_parsel}} | {{tasinmaz_3_islem_turu}} | {{tasinmaz_3_fiyat}} |

*Uygulama, gösterimdeki taşınmaz sayısı kadar satır üretir; boş satırlar çıktıdan çıkarılır. Yalnızca fiilen gösterilen taşınmazlar listelenir.*

## 5. Hizmet Bedeli Beyanı

Taşınmazı gösterilen kişi, yukarıdaki taşınmazlardan herhangi birini satın alması veya kiralaması hâlinde İŞLETME'ye aşağıdaki hizmet bedelini ödeyeceği konusunda bilgilendirildiğini beyan eder:

- Satın almada: satış bedelinin **%{{hizmet_bedeli_orani}} + KDV**'si,
- Kiralamada: **{{hizmet_bedeli_kira_ay}} aylık kira bedeli + KDV**.

Bu oranlar Taşınmaz Ticareti Hakkında Yönetmelik'teki üst sınırları aşamaz (üst sınırlar teyit edilmeli).

## 6. Taahhüt

Taşınmazı gösterilen kişi;

a) Bu belgede listelenen taşınmazların kendisine ilk kez İŞLETME tarafından tanıtıldığını ve gösterildiğini; aksi hâlde (daha önce başka bir işletme veya malik tarafından gösterilmişse) bunu gösterim sırasında "Notlar" bölümüne yazdıracağını,

b) Gösterim tarihinden itibaren **{{koruma_suresi_ay}} ay** içinde, listelenen taşınmazlardan birini **doğrudan malikten veya üçüncü kişiler aracılığıyla** (eşi, birinci derece yakını, ortağı olduğu veya temsil ettiği şirket dâhil) satın alması veya kiralaması hâlinde, Madde 5'te belirtilen hizmet bedelini İŞLETME'ye ödeyeceğini,

c) Malik ile İŞLETME'yi devre dışı bırakacak şekilde doğrudan iletişime geçmeyeceğini,

kabul ve taahhüt eder.

> **Hukuki not (teyit edilmeli):** Koruma süresinin uzunluğu, hizmet bedelinin bu hâlde niteliği (TBK simsarlık hükümleri uyarınca hak edilen ücret mi, ceza koşulu mu) ve taahhüdün tüketiciler bakımından haksız şart denetimine dayanıklılığı hukuk danışmanınca değerlendirilmelidir. Ceza koşulu niteliğindeki bedeller TBK md. 182 uyarınca indirilebilir.

## 7. Kişisel Veriler

Taşınmazı gösterilen kişi, kişisel verilerinin İŞLETME tarafından yer gösterme hizmetinin belgelenmesi ve hizmet bedeli hakkının ispatı amacıyla işlenmesine ilişkin KVKK Aydınlatma Metni'nin kendisine sunulduğunu beyan eder. Konum ve zaman bilgisi yalnızca gösterimin gerçekleştiğinin ispatı amacıyla kaydedilir.

## 8. Notlar

{{notlar}}

## 9. İmza ve Elektronik Doğrulama Kaydı

İmza yöntemi: **{{imza_yontemi}}** (Islak imza / SMS-OTP ile elektronik onay / Nitelikli elektronik imza)

| Doğrulama alanı | Değer |
|---|---|
| OTP gönderilen telefon (maskeli) | {{otp_telefon_maskeli}} |
| OTP doğrulama referansı | {{otp_dogrulama_kodu_ref}} |
| Zaman damgası (UTC ve TSİ) | {{zaman_damgasi}} |
| Konum (enlem, boylam) | {{konum_enlem}}, {{konum_boylam}} |
| Konum doğruluğu (m) | {{konum_dogruluk_m}} |
| Cihaz bilgisi | {{cihaz_bilgisi}} |
| Belge özet değeri (SHA-256) | {{belge_ozet_degeri}} |

*OTP ile verilen elektronik onay, 5070 sayılı Kanun anlamında güvenli elektronik imza değildir; ispat gücü delil başlangıcı/ takdiri delil niteliğinde değerlendirilebilir (teyit edilmeli). Yüksek tutarlı işlemlerde ıslak veya nitelikli elektronik imza tercih edilmelidir.*

| İŞLETME / Yer Gösteren Danışman | Taşınmazı Gösterilen Kişi |
|---|---|
| {{danisman_ad_soyad}} | {{gosterilen_ad_soyad}} |
| İmza: | İmza: |

---
*Belge kodu: yer-gosterme-belgesi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
