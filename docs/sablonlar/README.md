# DC Emlak — Sözleşme ve Evrak Şablonları

> ## ⚠️ TASLAK — Hukuk onayı bekliyor.
> **Bu şablonlar genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.**
>
> Metinlerde **"(teyit edilmeli)"** ibaresiyle işaretlenen madde numaraları, oranlar, tutarlar, süreler ve tarihler kesinleşmiş bilgi değildir; canlıya çıkmadan önce güncel Resmî Gazete ve mevzuat metinleri üzerinden tek tek doğrulanmalıdır. Hiçbir şablon, hukuk danışmanının onayı ve `durum` alanının güncellenmesi olmadan müşteriye imzaya gönderilmemelidir.

Sürüm: **2026.09-taslak** — Hazırlanma tarihi: 24.09.2026 — İlgili tasarım bölümleri: `TASARIM.md` §5.10 (Sözleşme & Evrak Merkezi) ve §6 (Mevzuat ve Uyum Motoru).

## 1. Şablon Dizini

| # | Dosya | Belge | Kullanıldığı akış |
|---|---|---|---|
| 1 | [`yetki-sozlesmesi.md`](yetki-sozlesmesi.md) | Taşınmaz Alım/Satım ve Kiralama Yetki Sözleşmesi (münhasır / münhasır olmayan) | Portföy → "Yetki Alındı" durumu; ilan butonunu açar |
| 2 | [`yer-gosterme-belgesi.md`](yer-gosterme-belgesi.md) | Yer Gösterme Belgesi (çoklu taşınmaz, OTP + konum/zaman damgası) | Saha & Takvim → gösterim kapanışı |
| 3 | [`kapora-on-protokol.md`](kapora-on-protokol.md) | Kapora / Ön Satış Protokolü | İşlem Hattı → teklif kabulü |
| 4 | [`konut-kira-sozlesmesi.md`](konut-kira-sozlesmesi.md) | Konut Kira Sözleşmesi (genel + özel şartlar) | Kira kapanış kontrol listesi |
| 5 | [`isyeri-kira-sozlesmesi.md`](isyeri-kira-sozlesmesi.md) | İşyeri Kira Sözleşmesi (stopaj, KDV) | Kira kapanış kontrol listesi |
| 6 | [`tahliye-taahhutnamesi.md`](tahliye-taahhutnamesi.md) | Tahliye Taahhütnamesi | Kira & Mülk Yönetimi (teslimden **sonra**) |
| 7 | [`teslim-tutanagi.md`](teslim-tutanagi.md) | Anahtar ve Demirbaş Teslim Tutanağı (sayaç endeksleri, fotoğraf eki) | Satış/kira kapanışı, tahliye |
| 8 | [`kvkk-aydinlatma-metni.md`](kvkk-aydinlatma-metni.md) | KVKK Aydınlatma Metni (ofis = veri sorumlusu) | Her kişi kartı oluşturulurken |
| 9 | [`acik-riza-formu.md`](acik-riza-formu.md) | Açık Rıza Formu (İYS, arama kaydı, yurt dışı aktarım, fotoğraf/video — ayrı kutucuklar) | Kişi kartı → iletişim izinleri |
| 10 | [`ortak-satis-protokolu.md`](ortak-satis-protokolu.md) | Ortak Satış (Co-Broke) Hizmet Bedeli Paylaşım Protokolü | Ofis Ağı / MLS |
| 11 | [`masak-musteri-tanima-formu.md`](masak-musteri-tanima-formu.md) | Müşteriyi Tanı (KYC) Formu — kimlik, gerçek faydalanıcı, fon kaynağı, PEP | Eşik üstü işlemler / şüpheli durum |

## 2. Yer Tutucular (Placeholder) Nasıl Çalışır?

### 2.1 Söz dizimi

- Gövde metninde her değişken alan **`{{alan_adi}}`** biçimindedir; alan adları **snake_case**, Türkçe karakter içermeyen küçük harflerdir (ör. `{{isletme_unvani}}`, `{{yetki_belgesi_no}}`, `{{malik_ad_soyad}}`, `{{ada}}`, `{{parsel}}`, `{{satis_bedeli}}`, `{{hizmet_bedeli_orani}}`).
- Aynı alan adı tüm şablonlarda aynı anlamı taşır (ör. `ada`, `parsel`, `bagimsiz_bolum_no`, `isletme_unvani`); uygulama bu alanları portföy, kişi ve ofis kartlarından **otomatik doldurur**.
- Tekrarlı satırlar numaralı alanlarla gösterilmiştir (`tasinmaz_1_adres`, `demirbas_2_adi` …). Uygulama gerçek kayıt sayısı kadar satır üretir, boş satırları çıktıdan çıkarır.
- `[ ]` işaret kutucukları seçenekleri gösterir; seçim, ilgili alanın değerinde saklanır (ör. `yetki_turu: "munhasir"`). Açık rıza kutucukları **hiçbir zaman önceden işaretli gelmez**.

### 2.2 YAML ön bilgi (front matter)

Her şablonun başında geçerli bir YAML bloğu bulunur:

```yaml
---
baslik: "Belgenin adı"
kod: "dosya-adi"                 # şablonun sabit kimliği
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:                 # boşsa imzaya gönderim ENGELLENİR
  - isletme_unvani
  - yetki_belgesi_no
opsiyonel_alanlar:               # boş kalabilir; çıktıda "—" basılır
  - ozel_sartlar
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 344"
---
```

- `zorunlu_alanlar` ve `opsiyonel_alanlar` listelerinde alan adları **süslü parantez olmadan** yazılır (YAML'ı bozmamak için). Gövdede kullanılan her yer tutucu bu iki listeden **birinde** yer alır.
- Uygulama, `zorunlu_alanlar` içindeki herhangi bir alan boşsa belgeyi **imzaya gönderemez** (Uyum Motoru: ENGELLE).
- `tahliye-taahhutnamesi.md` ek olarak bir `kontroller` listesi içerir (ör. taahhüt tarihi > teslim tarihi). Bu ifadeler insan tarafından okunur açıklamalardır; uygulama bunları kural setinde karşılık gelen tarih kontrolleriyle uygular.
- Her imzalı belge, imza anındaki `surum` değerini ve kural seti versiyonunu saklar. Metin değiştiğinde `surum` artırılır; eski sürümle imzalanmış belgeler değişmez.
- Hukuk onayı alındığında `durum` alanı ör. `"Onaylı — Av. …, GG.AA.YYYY"` olarak güncellenir; uygulama `durum` "Taslak" ile başlıyorsa üretim ortamında imza akışını kapalı tutmalıdır (öneri).

### 2.3 Parametrik değerler

Oran, tutar ve süreler (hizmet bedeli üst sınırı, MASAK eşiği, stopaj/KDV oranı, koruma süresi) **metne gömülmez**; parametre tablosundan (§6 Uyum Motoru) gelir ve yer tutucu olarak basılır. Komisyon sihirbazı, yönetmelikteki üst sınırı aşan değerin girilmesini engeller.

## 3. Yasal Dayanaklar

| Mevzuat | Kullanıldığı şablonlar | Not |
|---|---|---|
| **Taşınmaz Ticareti Hakkında Yönetmelik** (Ticaret Bakanlığı; RG 05.06.2018 / 30442 — teyit edilmeli) ve değişiklikleri | Yetki sözleşmesi, yer gösterme belgesi, ortak satış protokolü, kapora protokolü | Yetki belgesi, yazılı yetkilendirme, yer gösterme belgesi, hizmet bedeli üst sınırı (referans: satışta her taraftan %2 + KDV, kirada 1 aylık kira + KDV), belge saklama. **Madde numaraları ve güncel üst sınırlar teyit edilmeli.** |
| **6098 sayılı Türk Borçlar Kanunu** — kira hükümleri md. 299 vd.; konut ve çatılı işyeri md. 339 vd.; **güvence bedeli md. 342**; **kira artışı md. 344**; md. 346; uzama md. 347; tahliye md. 350-352 | Konut ve işyeri kira sözleşmeleri, tahliye taahhütnamesi, teslim tutanağı | Konut ve işyeri kira artışı: önceki kira yılının 12 aylık TÜFE ortalaması üst sınırı; güvence bedeli en fazla 3 aylık kira. |
| 6098 sayılı TBK — md. 177-178 (bağlanma parası / cayma parası), md. 179-182 (ceza koşulu), md. 237 (taşınmaz satışında resmî şekil), md. 520 vd. (simsarlık), md. 583-584 (kefalet şekli) | Kapora protokolü, yetki sözleşmesi, yer gösterme belgesi, kira sözleşmeleri | 177/178 eşleşmesi ve simsarlık madde aralığı **teyit edilmeli**. |
| **6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)** — md. 5, 6, 9 (7499 sayılı Kanun ile 2024 değişikliği), 10, 11, 13 | Aydınlatma metni, açık rıza formu; tüm şablonlarda atıf | Yurt dışı aktarım (bulut) md. 9: yeterlilik kararı → uygun güvenceler (standart sözleşme) → arızi hâllerde açık rıza. **2024 değişikliğinin ayrıntıları ve Kurul'a bildirim süresi teyit edilmeli.** |
| **6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun / İleti Yönetim Sistemi (İYS)** | Açık rıza formu, aydınlatma metni | Ticari elektronik ileti onayı ve İYS kaydı. |
| **5549 sayılı Suç Gelirlerinin Aklanmasının Önlenmesi Hakkında Kanun (MASAK)** ve Tedbirler Yönetmeliği | MASAK müşteri tanıma formu, kapora protokolü, aydınlatma metni | Emlak işletmeleri yükümlü; kimlik tespiti, gerçek faydalanıcı, PEP, şüpheli işlem bildirimi, 8 yıl saklama. **Güncel kimlik tespiti eşik tutarı ve madde numaraları teyit edilmeli.** |
| **Elektronik İlan Doğrulama Sistemi (EİDS)** | Yetki sözleşmesi | **Dayanak düzenleme ve EİDS'nin yönetmelikteki yeri teyit edilmeli**; şablonlarda kanun numarası kullanılmamış, "EİDS düzenlemesi" olarak atıf yapılmıştır. |
| **492 sayılı Harçlar Kanunu** (tapu harcı) | Kapora protokolü | Alıcı ve satıcı için ayrı ayrı binde 20 (toplam %4) — **güncel oran teyit edilmeli**. Döner sermaye bedeli yıllık güncellenir. |
| **DASK zorunluluğu** | Kapora protokolü, kira sözleşmeleri | ⚠️ Zorunlu deprem sigortasının dayanağı **6305 sayılı Afet Sigortaları Kanunu**'dur; **6306 sayılı Kanun** "Afet Riski Altındaki Alanların Dönüştürülmesi Hakkında Kanun"dur (kentsel dönüşüm). Şablonlarda **6305** kullanılmıştır — **teyit edilmeli**. |
| 193 sayılı GVK md. 94 (stopaj), 3065 sayılı KDV Kanunu, 488 sayılı Damga Vergisi Kanunu | İşyeri ve konut kira sözleşmeleri | Oranlar ve istisnalar **teyit edilmeli** (mali müşavir). |
| 6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu md. 18/B | Kira sözleşmeleri, tahliye taahhütnamesi | Kira uyuşmazlıklarında dava şartı arabuluculuk — **teyit edilmeli**. |
| 6502 sayılı Tüketicinin Korunması Hakkında Kanun | Yetki sözleşmesi, yer gösterme belgesi | Malik/alıcı tüketici ise haksız şart denetimi ve tüketici yargı yolu. |
| 2004 sayılı İcra ve İflas Kanunu md. 272 vd. | Tahliye taahhütnamesi | Tahliye taahhüdüne dayalı icra takibi — **teyit edilmeli**. |

## 4. Hukuk Danışmanına İletilecek Kontrol Listesi

1. Taşınmaz Ticareti Hakkında Yönetmelik'in güncel metni: yetki sözleşmesi zorunlu unsurları, yer gösterme belgesi şekli, hizmet bedeli üst sınırları ve kiralamada paylaşım esası, belge saklama süresi, EİDS hükümleri.
2. Yetki sözleşmesi Madde 7.2 ve yer gösterme belgesi Madde 6'daki "koruma süresi" içinde doğrudan/üçüncü kişi aracılığıyla işlemde hizmet bedeli hükmünün geçerliliği; tüketici işlemlerinde haksız şart riski; ceza koşulu indirimi (TBK md. 182).
3. Kapora protokolünün resmî şekil eksikliği karşısındaki etkisi; bağlanma/cayma parası hükümlerinin uygulanabilirliği; noterde satış vaadi önerisi.
4. OTP ile elektronik onayın ispat gücü; hangi belgelerde ıslak veya nitelikli e-imza zorunlu tutulmalı (özellikle tahliye taahhütnamesi ve kefalet).
5. Kefaletin elektronik ortamda kurulup kurulamayacağı ve el yazısı şartı.
6. KVKK md. 9 (2024 değişikliği) sonrası bulut aktarımı için standart sözleşme ve Kurul'a bildirim yükümlülüğü; açık rızanın rolü.
7. MASAK: taşınmaz işlemlerinde güncel kimlik tespiti eşiği, gerçek faydalanıcı oranı, PEP tedbirleri, şüpheli işlem bildirim süresi.
8. Tapu harcı oranı, stopaj oranı, işyeri kirasında KDV, kira sözleşmesinde damga vergisi.
9. Taşınmaz satış bedellerinin banka kanalıyla ödenmesine ilişkin güncel düzenleme ve eşik.
10. DASK dayanağının 6305 sayılı Afet Sigortaları Kanunu olduğunun teyidi.
11. Ortak satış protokolünün 4054 sayılı Kanun bakımından (komisyon koordinasyonu) değerlendirilmesi.
