---
baslik: "Müşteriyi Tanı (MASAK) Formu"
kod: "masak-musteri-tanima-formu"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - form_no
  - form_tarihi
  - isletme_unvani
  - yetki_belgesi_no
  - uyum_sorumlusu_ad_soyad
  - musteri_turu
  - musteri_ad_soyad_unvan
  - musteri_kimlik_no
  - kimlik_belgesi_turu
  - kimlik_belgesi_seri_no
  - uyruk
  - dogum_yeri_tarihi
  - anne_adi
  - baba_adi
  - musteri_adres
  - musteri_telefon
  - meslek_faaliyet
  - islem_turu
  - islem_rolu
  - tasinmaz_bilgisi
  - islem_tutari
  - para_birimi
  - odeme_yontemi
  - fonun_kaynagi
  - gercek_faydalanici_beyani
  - pep_beyani
  - kimlik_dogrulama_yontemi
opsiyonel_alanlar:
  - musteri_eposta
  - vergi_no
  - ticaret_sicil_no
  - mersis_no
  - imza_sirkuleri_tarihi
  - temsilci_ad_soyad
  - temsilci_kimlik_no
  - temsil_belgesi
  - gercek_faydalanici_ad_soyad
  - gercek_faydalanici_kimlik_no
  - gercek_faydalanici_uyruk
  - gercek_faydalanici_pay_orani
  - pep_gorev_aciklama
  - fonun_kaynagi_belgesi
  - baglantili_islemler
  - risk_degerlendirmesi
  - supheli_islem_notu
  - masak_esik_tutari
dayanak:
  - "5549 sayılı Suç Gelirlerinin Aklanmasının Önlenmesi Hakkında Kanun md. 3 (kimlik tespiti), md. 4 (şüpheli işlem bildirimi), md. 8 (saklama)"
  - "Suç Gelirlerinin Aklanmasının ve Terörün Finansmanının Önlenmesine Dair Tedbirler Hakkında Yönetmelik (yükümlüler — taşınmaz alım satımıyla uğraşanlar; kimlik tespiti eşiği, gerçek faydalanıcı, PEP — madde numaraları ve güncel eşik tutarı teyit edilmeli)"
  - "6415 sayılı Terörün Finansmanının Önlenmesi Hakkında Kanun"
  - "MASAK genel tebliğleri ve rehberleri (gerçek faydalanıcı, siyasi nüfuz sahibi kişiler — teyit edilmeli)"
  - "6698 sayılı Kişisel Verilerin Korunması Kanunu md. 5/2-a ve ç"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# MÜŞTERİYİ TANI FORMU (MASAK)

**Form No:** {{form_no}} — **Tarih:** {{form_tarihi}}
**Yükümlü:** {{isletme_unvani}} (Yetki Belgesi No: {{yetki_belgesi_no}})
**Uyum görevlisi / formu düzenleyen:** {{uyum_sorumlusu_ad_soyad}}

> **Uygulama kuralı:** Taşınmaz alım satımına aracılık eden işletmeler 5549 sayılı Kanun kapsamında **yükümlüdür**. İşlem tutarı veya bağlantılı işlemler toplamı yönetmelikte belirlenen eşiği (**{{masak_esik_tutari}}** — güncel tutar teyit edilmeli) aştığında veya tutara bakılmaksızın şüpheli işlem bildirimini gerektiren hâllerde bu form doldurulur. Eşik tutarı parametre tablosundan gelir. **Müşteriye şüpheli işlem bildirimi yapıldığı veya yapılacağı hiçbir şekilde bildirilmez.**

## 1. Müşteri Bilgileri

Müşteri türü: {{musteri_turu}} — [ ] Gerçek kişi (T.C. vatandaşı) [ ] Gerçek kişi (yabancı) [ ] Tüzel kişi [ ] Tüzel kişiliği olmayan teşekkül

| Alan | Bilgi |
|---|---|
| Ad Soyad / Unvan | {{musteri_ad_soyad_unvan}} |
| T.C. Kimlik No / Yabancı Kimlik No / Pasaport No | {{musteri_kimlik_no}} |
| Kimlik belgesi türü ve seri no | {{kimlik_belgesi_turu}} — {{kimlik_belgesi_seri_no}} |
| Uyruk | {{uyruk}} |
| Doğum yeri ve tarihi | {{dogum_yeri_tarihi}} |
| Anne adı / Baba adı | {{anne_adi}} / {{baba_adi}} |
| Adres | {{musteri_adres}} |
| Telefon / E-posta | {{musteri_telefon}} / {{musteri_eposta}} |
| Meslek / Faaliyet konusu | {{meslek_faaliyet}} |

**Tüzel kişiler için:** Vergi No {{vergi_no}} — Ticaret Sicil No {{ticaret_sicil_no}} — MERSİS No {{mersis_no}} — İmza sirküleri tarihi {{imza_sirkuleri_tarihi}}

**Adına hareket edilen (temsil) durumunda:** Temsilci {{temsilci_ad_soyad}}, Kimlik No {{temsilci_kimlik_no}}, Temsil belgesi (vekâletname/imza sirküleri) {{temsil_belgesi}}

Kimlik doğrulama yöntemi: {{kimlik_dogrulama_yontemi}} (Aslı görüldü + suret alındı / NVİ-KPS sorgusu / NFC çipli kimlik doğrulaması / Diğer — yöntemin mevzuata uygunluğu teyit edilmeli)

## 2. İşlem Bilgileri

| Alan | Bilgi |
|---|---|
| İşlem türü | {{islem_turu}} (Satış / Kiralama) |
| Müşterinin rolü | {{islem_rolu}} (Alıcı / Satıcı / Kiracı / Kiraya veren) |
| Taşınmaz | {{tasinmaz_bilgisi}} |
| İşlem tutarı | {{islem_tutari}} {{para_birimi}} |
| Ödeme yöntemi | {{odeme_yontemi}} |
| Bağlantılı işlemler | {{baglantili_islemler}} |

*Nakit ödeme tavsiye edilmez; ödemenin banka kanalıyla yapılması ve belgelenmesi esastır.*

## 3. Fonun Kaynağı Beyanı

İşlemde kullanılacak fonların kaynağı:

{{fonun_kaynagi}}

- [ ] Maaş / ücret geliri birikimi
- [ ] Ticari faaliyet geliri
- [ ] Başka bir taşınmazın satışı
- [ ] Banka kredisi
- [ ] Miras / bağış
- [ ] Yurt dışından transfer
- [ ] Diğer: ..................

Destekleyici belge (varsa): {{fonun_kaynagi_belgesi}}

## 4. Gerçek Faydalanıcı Beyanı

{{gercek_faydalanici_beyani}}

- [ ] Bu işlemi **kendi adıma ve hesabıma** yapıyorum; işlemin nihai faydalanıcısı benim.
- [ ] Bu işlemi **başkası adına/hesabına** yapıyorum. Gerçek faydalanıcı:

| Ad Soyad | Kimlik No | Uyruk | Pay / Kontrol oranı |
|---|---|---|---|
| {{gercek_faydalanici_ad_soyad}} | {{gercek_faydalanici_kimlik_no}} | {{gercek_faydalanici_uyruk}} | {{gercek_faydalanici_pay_orani}} |

*Tüzel kişilerde, şirkette belirli bir oranın üzerinde (yönetmelikte belirtilen oran — teyit edilmeli) paya sahip veya nihai kontrolü elinde bulunduran gerçek kişi(ler) yazılır; bu tespit edilemiyorsa üst düzey yönetici gerçek faydalanıcı kabul edilir (teyit edilmeli).*

5549 sayılı Kanun md. 3/2 uyarınca başkası hesabına hareket edenlerin, işlemi yapmadan önce kimin hesabına hareket ettiğini yükümlüye yazılı olarak bildirmek zorunda olduğu konusunda bilgilendirildim (teyit edilmeli).

## 5. Siyasi Nüfuz Sahibi Kişi (PEP) Beyanı

{{pep_beyani}}

- [ ] Ben, ailemin bir ferdi veya yakın iş ortağım, yurt içinde veya yurt dışında önemli bir kamu görevi (devlet/hükümet başkanı, bakan, milletvekili, yüksek yargı üyesi, büyükelçi, genelkurmay/kuvvet komutanı, kamu iktisadi teşebbüsü üst yöneticisi, siyasi parti üst düzey yöneticisi vb.) **yürütmekte değiliz / yürütmedik**.
- [ ] Ben, ailemin bir ferdi veya yakın iş ortağım bu kapsamda bir görev **yürütmekteyiz / yürüttük**. Açıklama: {{pep_gorev_aciklama}}

*PEP kapsamının ve bu kişilere uygulanacak sıkılaştırılmış tedbirlerin (üst yönetim onayı, fon kaynağının araştırılması vb.) yükümlü işletmeler için uygulanma şekli teyit edilmelidir.*

## 6. Yükümlü Değerlendirmesi (yalnızca işletme içi — müşteriye gösterilmez)

Risk değerlendirmesi: {{risk_degerlendirmesi}} (Düşük / Orta / Yüksek)

Şüpheli işlem göstergesi notu: {{supheli_islem_notu}}

- Şüphe varsa, uyum görevlisi değerlendirmesi sonrası MASAK Online üzerinden **şüpheli işlem bildirimi** yapılır (bildirim süresi — teyit edilmeli). Bildirim yapıldığına dair bilgi, işlem taraflarıyla veya üçüncü kişilerle paylaşılamaz.
- Kimlik tespiti yapılamayan veya işlemin amacı hakkında yeterli bilgi edinilemeyen hâllerde işleme aracılık edilmez ve durum değerlendirilir (teyit edilmeli).
- Bu form ve ekleri, düzenlendiği tarihten itibaren **8 yıl** süreyle saklanır ve istenmesi hâlinde yetkililere ibraz edilir (5549 sayılı Kanun md. 8 — teyit edilmeli).

## 7. Müşteri Beyanı

Bu formda verdiğim bilgilerin doğru ve eksiksiz olduğunu, değişiklik hâlinde derhâl bildireceğimi, gerçeğe aykırı beyanın hukuki ve cezai sonuçları olabileceğini bildiğimi beyan ederim. Kişisel verilerimin 5549 sayılı Kanun ve ilgili mevzuat kapsamında, hukuki yükümlülüğün yerine getirilmesi amacıyla işleneceği ve saklanacağı konusunda aydınlatıldım.

| MÜŞTERİ | YÜKÜMLÜ İŞLETME ADINA |
|---|---|
| {{musteri_ad_soyad_unvan}} | {{uyum_sorumlusu_ad_soyad}} |
| İmza: | İmza / Kaşe: |

---
*Belge kodu: masak-musteri-tanima-formu · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
