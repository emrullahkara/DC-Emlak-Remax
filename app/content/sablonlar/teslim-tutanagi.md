---
baslik: "Anahtar ve Demirbaş Teslim Tutanağı"
kod: "teslim-tutanagi"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - tutanak_no
  - tutanak_tarihi
  - tutanak_saati
  - teslim_turu
  - iliskili_sozlesme
  - teslim_eden_ad_soyad
  - teslim_eden_tckn
  - teslim_alan_ad_soyad
  - teslim_alan_tckn
  - tasinmaz_acik_adres
  - ada
  - parsel
  - bagimsiz_bolum_no
  - anahtar_adedi
  - elektrik_sayac_no
  - elektrik_endeks
  - su_sayac_no
  - su_endeks
  - dogalgaz_sayac_no
  - dogalgaz_endeks
  - genel_durum
  - fotograf_adedi
opsiyonel_alanlar:
  - kumanda_kart_adedi
  - posta_kutusu_anahtari
  - elektrik_tesisat_no
  - su_abone_no
  - dogalgaz_abone_no
  - isitma_pay_olcer_notu
  - demirbas_1_adi
  - demirbas_1_marka_model
  - demirbas_1_adet
  - demirbas_1_durum
  - demirbas_2_adi
  - demirbas_2_marka_model
  - demirbas_2_adet
  - demirbas_2_durum
  - demirbas_3_adi
  - demirbas_3_marka_model
  - demirbas_3_adet
  - demirbas_3_durum
  - hasar_notlari
  - fotograf_klasor_baglantisi
  - danisman_ad_soyad
  - isletme_unvani
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 301 ve 334 (kiralananın teslimi ve geri verilmesi — teyit edilmeli)"
  - "6098 sayılı Türk Borçlar Kanunu md. 207 vd. (satış sözleşmesinde teslim ve hasar)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# ANAHTAR VE DEMİRBAŞ TESLİM TUTANAĞI

**Tutanak No:** {{tutanak_no}} — **Tarih / Saat:** {{tutanak_tarihi}} / {{tutanak_saati}}

**Teslim türü:** {{teslim_turu}}
- [ ] Kira başlangıcı (kiraya verenden kiracıya)
- [ ] Kira sonu / tahliye (kiracıdan kiraya verene)
- [ ] Satış (satıcıdan alıcıya)

**İlişkili sözleşme:** {{iliskili_sozlesme}}

## 1. Taraflar

| | Ad Soyad | T.C. Kimlik No |
|---|---|---|
| Teslim eden | {{teslim_eden_ad_soyad}} | {{teslim_eden_tckn}} |
| Teslim alan | {{teslim_alan_ad_soyad}} | {{teslim_alan_tckn}} |
| Aracı danışman (varsa) | {{danisman_ad_soyad}} — {{isletme_unvani}} | |

## 2. Taşınmaz

{{tasinmaz_acik_adres}} — {{ada}} ada / {{parsel}} parsel / {{bagimsiz_bolum_no}} no.lu bağımsız bölüm

## 3. Anahtarlar ve Erişim Araçları

| Kalem | Adet |
|---|---|
| Daire/kapı anahtarı | {{anahtar_adedi}} |
| Kumanda / giriş kartı | {{kumanda_kart_adedi}} |
| Posta kutusu anahtarı | {{posta_kutusu_anahtari}} |

## 4. Sayaç Endeksleri

| Sayaç | Sayaç No | Tesisat / Abone No | Endeks (teslim anı) |
|---|---|---|---|
| Elektrik | {{elektrik_sayac_no}} | {{elektrik_tesisat_no}} | {{elektrik_endeks}} kWh |
| Su | {{su_sayac_no}} | {{su_abone_no}} | {{su_endeks}} m³ |
| Doğalgaz | {{dogalgaz_sayac_no}} | {{dogalgaz_abone_no}} | {{dogalgaz_endeks}} m³ |

Isınma pay ölçer / kalorimetre notu: {{isitma_pay_olcer_notu}}

*Her sayacın endeksi fotoğraflanır; fotoğraflar tutanak ekindedir. Teslim eden, teslim tarihine kadar olan tüketim bedellerinden; teslim alan, teslim tarihinden sonraki tüketimden sorumludur. Aboneliklerin devri veya yeni abonelik tarafların sorumluluğundadır.*

## 5. Demirbaşlar

| # | Demirbaş | Marka / Model | Adet | Durum |
|---|---|---|---|---|
| 1 | {{demirbas_1_adi}} | {{demirbas_1_marka_model}} | {{demirbas_1_adet}} | {{demirbas_1_durum}} |
| 2 | {{demirbas_2_adi}} | {{demirbas_2_marka_model}} | {{demirbas_2_adet}} | {{demirbas_2_durum}} |
| 3 | {{demirbas_3_adi}} | {{demirbas_3_marka_model}} | {{demirbas_3_adet}} | {{demirbas_3_durum}} |

*Uygulama demirbaş sayısı kadar satır üretir. Durum: Yeni / Çalışır-sağlam / Kullanılmış-sağlam / Arızalı / Hasarlı.*

## 6. Genel Durum ve Hasar Notları

**Genel durum:** {{genel_durum}} (boya, zemin, kapı-pencere, ıslak hacimler, tesisat)

**Mevcut hasar ve eksiklikler:**

{{hasar_notlari}}

*Bu bölümde yazılmayan ve fotoğraflarla belgelenmeyen hasarların teslim anında bulunmadığı kabul edilir. Olağan kullanımdan doğan yıpranmalar kiracının sorumluluğunda değildir.*

## 7. Fotoğraf Eki

Tutanağa **{{fotograf_adedi}}** adet tarih ve konum damgalı fotoğraf eklenmiştir. Bağlantı: {{fotograf_klasor_baglantisi}}

Fotoğraflar, tutanağın ayrılmaz parçasıdır; uygulama her fotoğrafın özet değerini (hash) tutanağa bağlar.

## 8. Beyan

Taraflar, yukarıda sayılan anahtar ve demirbaşların belirtilen durumda teslim edildiğini/teslim alındığını, sayaç endekslerinin birlikte okunduğunu ve bu tutanağın içeriğini kabul ettiklerini beyan ederler.

| TESLİM EDEN | TESLİM ALAN | ARACI DANIŞMAN |
|---|---|---|
| {{teslim_eden_ad_soyad}} | {{teslim_alan_ad_soyad}} | {{danisman_ad_soyad}} |
| İmza: | İmza: | İmza: |

---
*Belge kodu: teslim-tutanagi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
