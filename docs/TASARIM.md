# DC Emlak — Ürün ve Sistem Tasarımı (v0.1)

> **Tek ekrandan emlak ofisi yönetimi:** portföy, ilan, FSBO avcılığı, müşteri eşleştirme, yer gösterme, sözleşme, komisyon, tanıtım ve mevzuat uyumu.
>
> Bu belge; 40 yıllık saha tecrübesinin (bireysel ofis + RE/MAX tipi franchise ağı) ürüne dönüştürülmüş hâlidir. Hedef, danışmanın "keşke olsa" dediği şeyleri değil, **henüz aklına gelmeyenleri** de vermektir.

---

## İçindekiler

1. [Vizyon ve Temel İlkeler](#1-vizyon-ve-temel-ilkeler)
2. [Kullanıcılar ve Roller](#2-kullanıcılar-ve-roller)
3. [Danışmanın Bir Günü — Neyi Çözüyoruz?](#3-danışmanın-bir-günü--neyi-çözüyoruz)
4. [Modül Haritası](#4-modül-haritası)
5. [Modüller — Detaylı Tasarım](#5-modüller--detaylı-tasarım)
6. [Mevzuat ve Uyum Motoru](#6-mevzuat-ve-uyum-motoru)
7. [Ekran Tasarımları (Wireframe)](#7-ekran-tasarımları-wireframe)
8. [Veri Modeli](#8-veri-modeli)
9. [Teknik Mimari](#9-teknik-mimari)
10. [Entegrasyonlar](#10-entegrasyonlar)
11. [Güvenlik, KVKK ve Denetim](#11-güvenlik-kvkk-ve-denetim)
12. [Yapay Zekâ Katmanı](#12-yapay-zekâ-katmanı)
13. [Yol Haritası (MVP → v3)](#13-yol-haritası-mvp--v3)
14. [Başarı Ölçütleri](#14-başarı-ölçütleri)
15. [Açık Sorular](#15-açık-sorular)

---

## 1. Vizyon ve Temel İlkeler

### 1.1 Vizyon
Bir emlak danışmanının telefonu, defteri, Excel'i, WhatsApp grupları, ilan siteleri panelleri, e-Devlet sekmeleri ve hafızası arasında dağılmış işini **tek bir "Kokpit" ekranında** toplamak. Uygulama, danışmana ne yapacağını söyleyen, mevzuat hatalarını imzadan önce yakalayan ve her portföyü satışa en kısa yoldan götüren bir **iş ortağı** gibi davranır.

### 1.2 Tasarım İlkeleri

| İlke | Anlamı |
|---|---|
| **Sahada, tek elle** | Danışman arabada, tapuda, daire kapısında. Mobil öncelikli, büyük butonlar, sesle not, çevrimdışı çalışma. |
| **Bugün ne yapmalıyım?** | Açılış ekranı rapor değil, **aksiyon listesidir**: aranacak, gidilecek, imzalanacak, yenilenecek. |
| **Bir kez gir, her yere git** | Portföy bir kez girilir; ilan siteleri, sosyal medya, broşür, web sitesi, WhatsApp kataloğu otomatik beslenir. |
| **Mevzuat varsayılan olarak doğru** | Yetki sözleşmesi yoksa ilan yayınlanmaz; yer gösterme belgesi yoksa randevu "tamamlandı" yapılamaz. |
| **Hiçbir müşteri soğumaz** | Her kişi için "son temas" ve "sonraki adım" zorunlu alan; unutulan müşteri kırmızıya döner. |
| **Veri danışmanındır, ofis yönetir** | Franchise yapısına uygun çok katmanlı yetki: danışman → takım → ofis → bölge → merkez. |

---

## 2. Kullanıcılar ve Roller

| Rol | Kim? | Ana ihtiyaç |
|---|---|---|
| **Danışman (Agent)** | Sahadaki satış/kiralama uzmanı | Portföy almak, müşteri bulmak, eşleştirmek, satış kapatmak |
| **Takım Lideri** | 3–10 danışmanlık ekip lideri | Ekip hattı (pipeline), koçluk, portföy dağıtımı |
| **Broker / Ofis Sahibi** | Yetki belgesi sahibi işletme | Ciro, komisyon paylaşımı, uyum, danışman performansı |
| **Asistan / Ofis Yöneticisi** | Evrak, randevu, ilan girişi | Toplu işlem, belge takibi, tapu randevuları |
| **Bölge / Franchise Merkezi** | Çok ofisli ağ yönetimi | Ağ geneli raporlama, marka standardı, ofisler arası paylaşım (MLS) |
| **Müşteri (Portal)** | Alıcı, satıcı, kiracı, ev sahibi | Süreci şeffaf görmek, belge yüklemek, teklif vermek |
| **Dış Paydaş** | Avukat, ekspertiz, kredi danışmanı, fotoğrafçı, nakliyeci | Kendilerine atanan işi görmek ve tamamlamak |

Yetkilendirme **RBAC + kayıt sahipliği** ile yapılır: Danışman kendi kayıtlarını görür; paylaşılan (ortak/co-broke) portföylerde yalnızca izin verilen alanları görür (ör. mal sahibinin telefonu gizli).

---

## 3. Danışmanın Bir Günü — Neyi Çözüyoruz?

| Saat | Bugünkü dağınık hâl | DC Emlak ile |
|---|---|---|
| 08:30 | WhatsApp'ta 140 okunmamış mesaj, hangisi müşteri belli değil | **Gelen Kutusu**: tüm kanallar tek listede, kişiye ve portföye bağlı |
| 09:00 | Dünkü sahibinden ilanlarını elle tarama | **FSBO Radar** gece taradı; 12 yeni "sahibinden" ilan, puanlanmış, arama sırası hazır |
| 10:00 | Mal sahibiyle görüşme, fiyat tartışması | **Akıllı Değerleme (CMA)** raporu 2 dakikada, tabletten gösteriliyor |
| 11:00 | Yetki sözleşmesi kâğıtta, eksik alan | **e-Sözleşme** şablonu, zorunlu alanlar dolmadan imzaya gitmez, SMS-OTP ile imza |
| 13:00 | Fotoğraf, ilan metni, 4 sitede ayrı ayrı ilan | **Tek Tık Yayın**: AI metin + EİDS doğrulama + tüm kanallara dağıtım |
| 15:00 | Yer gösterme; belge unutuldu | Randevu kartında **Yer Gösterme Belgesi** dijital imza; konum ile doğrulanır |
| 17:00 | Alıcı "benzer var mı?" dedi | **Eşleştirme Motoru** anında 5 alternatif + ofis ağı portföyü |
| 19:00 | Komisyon hesabı, ofis payı, KDV karmaşık | **Komisyon Sihirbazı**: brüt → KDV → ofis payı → net, fatura taslağı |

---

## 4. Modül Haritası

```
                              ┌──────────────────────────┐
                              │    KOKPİT (Ana Ekran)    │
                              │ Bugün • Hat • Uyarılar   │
                              └────────────┬─────────────┘
   ┌───────────────┬──────────────┬────────┼────────┬───────────────┬──────────────┐
   ▼               ▼              ▼        ▼        ▼               ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PORTFÖY │   │ FSBO     │   │ CRM /    │ │EŞLEŞ-│ │ İLAN &   │ │ SÖZLEŞME │ │ FİNANS & │
│        │   │ RADAR    │   │ MÜŞTERİ  │ │TİRME │ │ PAZARLAMA│ │ & EVRAK  │ │ KOMİSYON │
└────────┘   └──────────┘   └──────────┘ └──────┘ └──────────┘ └──────────┘ └──────────┘
   │               │              │        │        │               │              │
   ▼               ▼              ▼        ▼        ▼               ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│DEĞERLE-│   │ SAHA &   │   │ İLETİŞİM │ │ İŞLEM│ │ KİŞİSEL  │ │ MEVZUAT  │ │ RAPOR &  │
│ME (CMA)│   │ TAKVİM   │   │ MERKEZİ  │ │ HATTI│ │ MARKA    │ │ MOTORU   │ │ ANALİTİK │
└────────┘   └──────────┘   └──────────┘ └──────┘ └──────────┘ └──────────┘ └──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌────────────┐  ┌──────────┐
              │ MÜŞTERİ  │  │ OFİS AĞI / │  │ KİRA &   │
              │ PORTALI  │  │ MLS        │  │ MÜLK YÖN.│
              └──────────┘  └────────────┘  └──────────┘
```

---

## 5. Modüller — Detaylı Tasarım

### 5.1 Kokpit (Ana Ekran)

Açılışta danışmana üç soruyu cevaplar: **Bugün ne yapmalıyım? Param nerede? Ne tehlikede?**

- **Bugünün Aksiyonları** (öncelik puanına göre sıralı):
  - Aranacak kişiler (FSBO, soğuyan müşteri, doğum günü, sözleşme yıl dönümü)
  - Randevular (yer gösterme, portföy alma, tapu)
  - İmza bekleyenler, eksik evraklar
  - Süresi dolan yetki sözleşmeleri (30/15/7 gün uyarısı)
  - Yayından düşecek ilanlar, fiyat revizyonu önerilen portföyler
- **Satış Hattı (Pipeline) Özeti:** Aşama başına adet ve **beklenen komisyon** (olasılık ağırlıklı).
- **Hedef Göstergesi:** Aylık/yıllık ciro hedefi vs gerçekleşen; "hedefe ulaşmak için bu ay X portföy, Y gösterim gerekir" (geri hesaplama).
- **Uyarılar:** Mevzuat (belgesiz gösterim, EİDS doğrulamasız ilan), KVKK (açık rıza eksik kişi), fiyatı piyasanın %15+ üzerinde portföy.
- **Pazar Nabzı:** Danışmanın bölgesinde bu hafta yeni ilanlar, fiyat düşüşleri, satılıp kalkan ilanlar.

### 5.2 Portföy Yönetimi

**Portföy kartı** tek gerçek kaynaktır (single source of truth).

- **Temel bilgiler:** Tip (daire, villa, arsa, tarla, dükkân, ofis, depo, otel, bina), satılık/kiralık/devren, fiyat ve fiyat geçmişi, m² (brüt/net), oda, kat, bina yaşı, ısınma, cephe, otopark, site/aidat, eşya durumu.
- **Tapu ve Hukuki Durum:** İl/ilçe/mahalle, ada/parsel, bağımsız bölüm, tapu türü (kat mülkiyeti / kat irtifakı / hisseli / arsa), **iskân durumu**, ipotek/haciz/şerh notları, imar durumu (TAKS/KAKS/emsal), kentsel dönüşüm riski, **krediye uygunluk** göstergesi.
- **Malik bilgileri:** Birden fazla malik, hisse oranları, vekâlet durumu, iletişim (KVKK rızası ile).
- **Medya:** Fotoğraf (otomatik sıralama, AI ile ışık/perspektif düzeltme, bulanık yüz/plaka maskeleme), video, 360° sanal tur, drone, kat planı, **AI sanal mobilya (virtual staging)** — sanal düzenlenmiş görseller ilanda zorunlu "temsilidir" etiketiyle.
- **Belgeler:** Tapu fotokopisi, yetki sözleşmesi, DASK poliçesi, enerji kimlik belgesi (EKB), iskân, aidat borcu yazısı, ekspertiz.
- **Durum yaşam döngüsü:**
  `Aday → Değerleme → Yetki Alındı → Yayında → Teklif Var → Kapora → Tapu Randevusu → Satıldı/Kiralandı → Arşiv`
- **Portföy Sağlık Skoru (0–100):** Fotoğraf kalitesi, açıklama yeterliliği, fiyat/piyasa uyumu, görüntülenme/arama oranı, son güncelleme tarihi. Skor düşükse somut öneri: *"Salon fotoğrafı karanlık", "Fiyat bölge medyanının %18 üzerinde; 21 gündür teklif yok."*
- **Mal sahibi raporu:** Haftalık otomatik rapor (WhatsApp/e-posta): görüntülenme, arama, gösterim, geri bildirimler, piyasa değişimi. *Portföy kaybını önleyen en güçlü araç budur.*

### 5.3 FSBO Radar (Sahibinden İlan Avcılığı)

> FSBO = *For Sale By Owner*. Türkiye'de portföyün en büyük kaynağı sahibinden ilanlarıdır.

- **Kaynak takibi:** Danışmanın tanımladığı bölge/fiyat/tip filtreleriyle yayındaki "sahibinden" ilanlarının izlenmesi. *(Her platformun kullanım koşullarına uygun yöntemle; resmî API/iş ortaklığı öncelikli, yoksa danışmanın kendi kaydettiği arama bağlantıları ve manuel ekleme. Bkz. [Açık Sorular](#15-açık-sorular).)*
- **Tekilleştirme:** Aynı mülk farklı sitelerde / farklı fiyatla → tek kayıt, fiyat geçmişiyle.
- **FSBO Skoru:** İlan yaşı, fiyat düşüş sayısı, fiyatın piyasaya göre konumu, açıklamadaki sinyaller ("acil", "tayin", "yurt dışı"), fotoğraf kalitesi → **"sıcak mal sahibi"** tahmini.
- **Arama Senaryoları:** Duruma göre hazır konuşma metni (itiraz karşılama: *"Komisyon vermem"*, *"Zaten kendim satarım"*, *"Başka emlakçı da aradı"*).
- **Takip Kadansı:** 1. gün arama → 3. gün değerleme raporu gönderimi → 7. gün piyasa bülteni → 14. gün yeniden arama → 30. gün "ilanınız hâlâ yayında" mesajı. Her adım otomatik görev olarak düşer.
- **Ekip Çakışma Kontrolü:** Aynı FSBO'yu ofisteki başka danışman aradıysa uyarı (bölge/sıra kuralına göre sahiplik).
- **Dönüşüm Hunisi:** Tespit → Arandı → Görüşüldü → Değerleme yapıldı → Yetki alındı.

### 5.4 CRM / Müşteri Yönetimi

- **Kişi tipleri:** Alıcı, satıcı, kiracı, ev sahibi, yatırımcı, yabancı alıcı, referans kaynağı, meslektaş.
- **Talep Profili (Arayış):** Bölge (harita üzerinde çizim), bütçe aralığı, kredi kullanımı ve ön onay durumu, oda, m², kat tercihi, "olmazsa olmaz" ve "olsa iyi olur" kriterleri, taşınma tarihi, aciliyet.
- **Müşteri Isı Skoru:** Son temas, yanıt hızı, gösterime gelme oranı, ön onaylı kredi, nakit durumu.
- **Zaman Tüneli:** Tüm aramalar, mesajlar, e-postalar, gösterimler, teklifler, notlar tek akışta.
- **Sesle Not:** Görüşme sonrası 30 sn ses kaydı → AI özet + otomatik görev ("Salı 14:00 tekrar ara, eşi de görmek istiyor").
- **Sfer (Farming) Yönetimi:** Danışmanın "kendi bölgesi" — bina bina, site site malik listesi, son temas, bölgede satılan/kiralanan mülkler; bölge pazar payı.
- **Referans Ağı:** Kimin kimi getirdiği, referans teşekkür/hediye hatırlatıcısı.
- **Hayat Boyu Müşteri:** Satıştan sonra: tapu yıl dönümü, kira artış dönemi, 5 yıllık değer artış kazancı muafiyet tarihi hatırlatması → yeniden satış fırsatı.

### 5.5 Eşleştirme Motoru

- Yeni portföy girildiğinde → uygun **tüm alıcı/kiracı profilleri** puanlanır ve listelenir.
- Yeni alıcı girildiğinde → uygun **ofis ve ağ portföyleri** listelenir.
- **Puanlama:** Konum (mesafe/poligon), fiyat toleransı (±%), zorunlu kriterler (sert filtre), tercih kriterleri (ağırlıklı), geçmiş davranış (beğendiği/reddettiği mülklerden öğrenme).
- **Tek tıkla paylaşım:** Seçilen mülkler → markalı mini katalog linki (WhatsApp/SMS/e-posta); müşteri beğen/beğenme yapar, danışman anlık bildirim alır.
- **Ters Eşleştirme:** "Bu alıcı için ağda mülk yok" → FSBO Radar'da ve sfer listesinde **hedefli portföy avı** başlatır.

### 5.6 İlan & Çok Kanallı Yayın

- **Tek form → çok kanal:** sahibinden.com, hepsiemlak, emlakjet, zingat vb. portallar (resmî entegrasyon/XML feed), ofis web sitesi, franchise ağ sitesi, Google İşletme, Instagram/Facebook, WhatsApp Katalog.
- **EİDS ön kontrol:** İlan, Elektronik İlan Doğrulama Sistemi'nden geçmeden yayına gönderilmez (bkz. §6).
- **AI İlan Metni:** Portföy verisi + fotoğraflardan; kanal bazlı uzunluk ve ton (portal: bilgi yoğun, Instagram: duygusal + hashtag, İngilizce/Arapça/Rusça çeviri yabancı alıcılar için). **Mevzuat filtresi:** Yanıltıcı ifadeleri ("en ucuz", "garantili kira getirisi") ve ayrımcı ifadeleri işaretler.
- **Fiyat Yönetimi:** Toplu fiyat güncelleme, fiyat düşüşü duyurusu (düşüşü takip eden alıcılara otomatik bildirim).
- **Performans:** Kanal bazında görüntülenme, favori, arama, mesaj → **hangi kanal gerçekten müşteri getiriyor?**
- **Yenileme / Doping takibi:** Bitiş tarihleri, doping bütçesi, getirisi.

### 5.7 Pazarlama & Kişisel Marka Stüdyosu

- **Tasarım şablonları:** "Yeni Portföy", "Satıldı", "Fiyat Düştü", "Açık Ev" gönderileri — franchise kurumsal kimliğine kilitli, danışman fotoğrafı ve iletişim bilgisi otomatik.
- **Broşür & Sunum:** Tek tıkla PDF portföy broşürü, **portföy alma sunumu** (danışmanın referansları, satış istatistikleri, pazarlama planı — mal sahibini ikna için).
- **Kısa Video (Reels):** Fotoğraflardan müzikli video, altyazı.
- **İçerik Takvimi:** Haftalık paylaşım planı, bölge pazar raporu içeriği.
- **Dijital Kartvizit:** QR kodlu, rehbere ekle, portföyler.
- **Tabela & QR:** Mülk tabelasına QR → ilan sayfası; kimin taradığını (anonim sayım) ve tarama sonrası form doldurulmasını izler.
- **Açık Ev (Open House):** Etkinlik sayfası, QR ile ziyaretçi kaydı (KVKK aydınlatma dâhil), sonrası otomatik takip.
- **Kampanya Otomasyonu:** Segmentli e-posta/SMS/WhatsApp (İYS kayıt ve izin kontrolü ile).

### 5.8 Saha & Takvim

- Takvim (Google/Outlook senkron), **rota optimizasyonu** (gün içinde 5 gösterim → en kısa rota), trafik bazlı hatırlatma.
- **Yer Gösterme Belgesi:** Randevu oluşturulunca taslak hazırlanır; müşteri telefonunda OTP ile imzalar; konum + zaman damgası eklenir. Belge olmadan gösterim kapatılamaz.
- **Gösterim Geri Bildirimi:** Müşteriden 2 dk'lık anket (fiyat, konum, durum puanı) → mal sahibi raporuna gider.
- **Anahtar Yönetimi:** Anahtar hangi danışmanda, kasada mı; teslim/iade kaydı.
- **Güvenlik:** Tek başına gösterimde "Güvendeyim" check-in; süre aşılırsa takım liderine alarm.
- **Çevrimdışı mod:** Bodrum kat, köy yolu — kayıtlar yerelde tutulur, bağlantı gelince senkronlanır.

### 5.9 Teklif & İşlem Hattı (Transaction Management)

- **Teklif yönetimi:** Çoklu teklif, karşı teklif zinciri, süreli teklif, teklif karşılaştırma tablosu (fiyat, peşinat, kredi, teslim tarihi).
- **Kapora / Cayma:** Kapora sözleşmesi şablonu, kapora tutarı, iade koşulları, emanet kaydı.
- **Kapanış Kontrol Listesi (satış):**
  1. Tapu kaydı sorgusu (takyidat) güncel mi?
  2. İskân / kat mülkiyeti kontrolü
  3. DASK poliçesi (tapu işlemi için zorunlu)
  4. Aidat borcu yazısı (site yönetimi)
  5. Belediye emlak vergisi borcu yok yazısı
  6. Kredi: ekspertiz randevusu, banka onayı, ipotek tesisi
  7. Zorunlu deprem sigortası ve konut sigortası
  8. Tapu randevusu (Web Tapu) ve harç tahsilatı
  9. Abonelik devirleri (elektrik, su, doğalgaz), anahtar teslim tutanağı
  10. Fatura kesimi ve komisyon tahsilatı
- **Kapanış Kontrol Listesi (kira):** Kimlik ve gelir kontrolü, kefil, depozito, demirbaş listesi, fotoğraflı teslim tutanağı, sözleşme, abonelik.
- **Paydaş Görünürlüğü:** Avukat, kredi danışmanı, ekspertiz, alıcı ve satıcı; her biri kendi adımını portal üzerinden görür ve tamamlar.
- **Zaman Çizelgesi:** "Tapuya kalan gün", geciken adımlar kırmızı.

### 5.10 Sözleşme & Evrak Merkezi

- **Şablon kütüphanesi (güncel mevzuata göre versiyonlanmış):**
  - Taşınmaz Alım/Satım ve Kiralama **Yetki Sözleşmesi** (münhasır/genel)
  - Yer Gösterme Belgesi
  - Kapora / Ön Protokol
  - Konut / İşyeri Kira Sözleşmesi, Tahliye Taahhütnamesi
  - Anahtar & Demirbaş Teslim Tutanağı
  - KVKK Aydınlatma Metni ve Açık Rıza Formu
  - Ortak Satış (co-broke) Paylaşım Protokolü
- **Akıllı alanlar:** Portföy/müşteri kartından otomatik dolar; zorunlu alanlar eksikse imzaya gönderilemez.
- **İmza:** Uzaktan OTP imzası, gerektiğinde nitelikli e-imza / e-Devlet entegrasyonu; ıslak imza için PDF + tarama.
- **Evrak Kasası:** Şifreli saklama, saklama süresi yönetimi (yönetmeliğin öngördüğü süre boyunca), denetimde tek tıkla dosya çıktısı.
- **OCR:** Kimlik ve tapu fotoğrafından alan çıkarımı (teyitli, KVKK uyumlu).

### 5.11 Finans & Komisyon

- **Komisyon Sihirbazı:** Satış bedeli/kira → yasal üst sınıra göre hizmet bedeli (bkz. §6.3) → KDV → toplam; alıcı ve satıcı tarafı ayrı ayrı.
- **Paylaşım (Split) Motoru:** Franchise ücreti, ofis payı, danışman payı, takım lideri payı, portföy getiren / müşteri getiren paylaşımı, ağlar arası ortak satış payı, referans ücreti. Kademeli (tier/cap) modeller.
- **Fatura:** e-Fatura / e-Arşiv entegrasyonu (GİB entegratörü üzerinden), tahsilat takibi, vadesi geçen komisyon uyarısı.
- **Masraf:** İlan dopingi, fotoğrafçı, broşür, yakıt — portföy bazında maliyet → **portföy kârlılığı**.
- **Danışman Cüzdanı:** Hak ediş, ödenen, bekleyen; yıllık gelir özeti (vergi beyanı için).
- **Maliyet Hesaplayıcılar (müşteriye gösterilecek):**
  - Tapu harcı, döner sermaye, DASK, ekspertiz, komisyon, KDV → **alıcının toplam cebinden çıkacak tutar**
  - Kredi taksiti ve peşinat simülasyonu (güncel faiz oranı girilebilir)
  - Kira getirisi / amortisman süresi, değer artış kazancı vergisi tahmini
  - Satıcının eline geçecek net tutar

### 5.12 Değerleme (CMA — Karşılaştırmalı Piyasa Analizi)

- Emsal ilanlar (aktif), satılmış/kalkmış ilanlar (ofisin kendi kapanış verisi + izinli veri kaynakları), bölge m² ortalamaları.
- **Düzeltme tablosu:** Kat, yaş, cephe, site, otopark, manzara için ağırlıklı düzeltme.
- **Çıktı:** Tavsiye edilen liste fiyatı aralığı, beklenen satış süresi, "bu fiyatla X gün, bu fiyatla Y gün" senaryosu.
- **Markalı Rapor:** Mal sahibine PDF/Link; haritada emsaller.
- **Uyarı:** Bu rapor SPK lisanslı değerleme raporu **değildir** ibaresi (yasal ayrım).

### 5.13 İletişim Merkezi (Birleşik Gelen Kutusu)

- WhatsApp Business API, SMS, e-posta, portal mesajları, web formu, Instagram DM → **tek gelen kutusu**, kişiye ve portföye otomatik bağlanır.
- **Santral / Çağrı:** Sanal santral entegrasyonu, arama kaydı (açık rıza ile), cevapsız aramaya otomatik SMS.
- **Hızlı Yanıtlar:** Şablonlar ve AI önerisi; ilk yanıt süresi ölçümü.
- **Lead Dağıtımı:** Ofise gelen talepleri kurala göre (bölge, sıra, uzmanlık, uygunluk) danışmana dağıtma; 5 dk içinde dönülmezse sonraki danışmana devretme.
- **İYS Kontrolü:** Ticari ileti göndermeden önce İleti Yönetim Sistemi izin sorgusu.

### 5.14 Kira & Mülk Yönetimi

- Kiralanan mülklerin kira tahsilat takibi, gecikme uyarısı.
- **Kira Artış Hesaplayıcı:** Sözleşme yenileme döneminde TÜİK 12 aylık TÜFE ortalamasına göre yasal üst sınır (bkz. §6.4); ev sahibi ve kiracıya otomatik bildirim taslağı.
- **5 Yıl / 10 Yıl kuralları:** Kira tespit davası ve tahliye süreleriyle ilgili hatırlatmalar.
- Bakım/arıza talebi, tedarikçi (tesisatçı, boyacı) yönlendirme.
- Ev sahibi portalı: aylık özet, tahsilat, masraf.

### 5.15 Ofis Ağı / MLS (Çoklu Listeleme)

- Ofis ve franchise ağı içinde portföy paylaşımı: **paylaşım seviyesi** (sadece ofis / bölge / tüm ağ / ağ dışı meslektaş).
- Paylaşım protokolü ve komisyon oranı ilan kartında görünür.
- Meslektaş talebi: "Şu kriterde müşterim var" → ağda yayın.
- Portföy sahipliği ve kimin müşteri getirdiği kayıt altında (anlaşmazlık çözümü için denetim izi).

### 5.16 Rapor & Analitik

- **Danışman:** Aktivite (arama, gösterim, portföy alma), dönüşüm oranları, ortalama satış süresi, liste fiyatı/satış fiyatı oranı, kanal başına maliyet.
- **Ofis:** Ciro, danışman sıralaması, portföy stok yaşı, bölge pazar payı, lead kaynak ROI.
- **Ağ/Merkez:** Ofis karşılaştırma, marka uyumu, ağlar arası paylaşım hacmi.
- **Tahmin:** Pipeline'a göre gelecek 90 gün beklenen ciro.

### 5.17 Müşteri Portalı

- **Satıcı:** İlanının performansı, gösterim geri bildirimleri, teklifler, belge yükleme.
- **Alıcı:** Kaydettiği mülkler, planlı gösterimler, teklif durumu, kapanış adımları.
- **Kiracı/Ev sahibi:** Sözleşme, ödeme, arıza bildirimi.
- Tüm portal girişleri **OTP ile, şifresiz**.

### 5.18 Eğitim & Koçluk (Akademi)

- Yeni danışman için oryantasyon yolu, mevzuat mini dersleri (ve yetki belgesi sınavına hazırlık).
- Arama senaryosu rol oyunu (AI müşteri ile pratik).
- Takım liderinin haftalık 1:1 koçluk ekranı: hedef, aktivite, takıldığı yer.

---

## 6. Mevzuat ve Uyum Motoru

> ⚠️ Aşağıdaki kurallar tasarım referansıdır. Oranlar ve tutarlar **parametre tablosunda** tutulur (kodda sabit değildir), her değişiklikte hukuk danışmanı onayıyla güncellenir ve her kayıt, işlem anında geçerli olan kural versiyonunu saklar. Canlıya çıkmadan önce tüm maddeler güncel Resmî Gazete üzerinden teyit edilmelidir.

### 6.1 Taşınmaz Ticareti Hakkında Yönetmelik (Ticaret Bakanlığı)
| Kural | Uygulamadaki karşılığı |
|---|---|
| Faaliyet için **Yetki Belgesi** zorunlu (işletme ve sorumlu kişiler) | Ofis ve danışman profilinde belge no + geçerlilik; belgesiz kullanıcı ilan yayınlayamaz |
| Mal sahibiyle **yazılı yetki sözleşmesi** olmadan ilan/pazarlama yapılamaz | "Yetki Alındı" durumuna geçmeden ilan butonu pasif |
| **Yer Gösterme Belgesi** düzenlenmesi | Gösterim randevusu belge imzalanmadan tamamlanamaz |
| İlanlarda yetki belgesi numarası ve işletme bilgileri bulunmalı | Tüm ilan çıktılarında otomatik alt bilgi |
| Kayıt ve belgelerin saklanması | Evrak kasasında süreli saklama + silme koruması |
| Hizmet bedeli üst sınırları | Komisyon sihirbazı sınırı aşan girişi engeller |

### 6.2 Elektronik İlan Doğrulama Sistemi (EİDS)
- İlan yayımlanmadan önce taşınmazın malik/yetki ilişkisinin **e-Devlet üzerinden doğrulanması** gerekir (malik → yetkili işletmeye yetki verir).
- Uygulama akışı: Portföy kartı → "EİDS Yetkilendirme Talebi" → malik e-Devlet'ten onaylar → doğrulama kodu/ID portföye bağlanır → portallara bu kimlikle gönderilir.
- Kokpit'te "EİDS onayı bekleyen portföyler" listesi ve malik için adım adım yönlendirme mesajı (WhatsApp ile gönderilebilir).

### 6.3 Hizmet Bedeli (Komisyon) — Parametrik Örnek
| İşlem | Üst sınır (referans) |
|---|---|
| Satış | Her bir taraftan satış bedelinin **%2'si + KDV** |
| Kiralama | Kiraya verenden ve/veya kiracıdan **1 aylık kira bedeli + KDV** (taraflar arası paylaşım) |

Sistem sözleşmede yazan oranı saklar ve üst sınırla karşılaştırır.

### 6.4 Kira Mevzuatı (TBK)
- Konut kira artışı: önceki kira yılının **12 aylık TÜFE ortalamasını** aşamaz (geçici %25 sınırı 2 Temmuz 2024'te sona erdi). TÜİK verisi otomatik çekilir.
- 5 yıl sonrası kira tespiti, 10 yıllık uzama süresi sonu, tahliye taahhüdü şartları → hatırlatıcılar.
- Depozito üst sınırı (konut için 3 aylık kira) → sözleşme şablonu kontrolü.

### 6.5 Tapu ve Vergi
- **Tapu harcı:** Alıcı ve satıcı için ayrı ayrı %2 (toplam %4) — hesaplayıcı beyan edilen değerin rayiç değerin altında olamayacağı uyarısını verir.
- **Döner sermaye** ücreti (yıllık güncellenen tutar).
- **DASK** zorunlu; poliçe yoksa tapu kontrol listesi kırmızı.
- **Değer artış kazancı:** 5 yıldan kısa elde tutmada vergilendirme uyarısı (satıcının net hesabına not).
- **KDV (yeni konut / müteahhit satışı):** m² ve durum bazlı oran tablosu.
- **Emlak vergisi** borcu yok yazısı hatırlatması.

### 6.6 Yabancıya Satış
- Uyruk kısıtlamaları, askerî yasak/güvenlik bölgesi kontrolü uyarısı, **değerleme raporu** zorunluluğu, döviz satışının TL'ye çevrilmesi (bankadan döviz alım belgesi), yeminli tercüman gereksinimi, vatandaşlık başvurusu eşik tutarı ve 3 yıl satmama şerhi — **Yabancı Alıcı Kontrol Listesi**.

### 6.7 KVKK, İYS, MASAK
- **KVKK:** Her kişi kartında aydınlatma metni + açık rıza durumu; rıza yoksa pazarlama iletisi ve arama kaydı pasif; veri sahibi başvuru (silme/erişim) iş akışı; VERBİS kaydı hatırlatıcı.
- **İYS:** Ticari elektronik ileti öncesi izin sorgusu.
- **MASAK (5549 sayılı Kanun):** Emlak işletmeleri yükümlü grubundadır → yüksek tutarlı işlemlerde **müşteriyi tanı** (kimlik tespiti, gerçek faydalanıcı), şüpheli işlem bildirimi için iç iş akışı ve eğitim kaydı.
- **Tapu işlemlerinde ödeme:** Belirli tutar üzeri ödemelerin banka kanalıyla yapılması ve belgelenmesi uyarısı.

### 6.8 Uyum Motoru Mimarisi
```
Olay (ilan yayınla / gösterim kapat / sözleşme imzala / mesaj gönder)
    │
    ▼
Kural Değerlendirici  ── kural_seti (versiyonlu, tarih aralıklı, parametrik)
    │
    ├─ ENGELLE  → kullanıcıya eksik adım + tek tık çözüm
    ├─ UYAR     → onaylanırsa gerekçe + denetim kaydı
    └─ GEÇ      → işlem devam, kural versiyonu kayda eklenir
```

---

## 7. Ekran Tasarımları (Wireframe)

### 7.1 Kokpit — Mobil
```
┌─────────────────────────────────┐
│ ☰  Günaydın Emrullah       🔔 3 │
├─────────────────────────────────┤
│ Eylül hedefi  ████████░░  %78   │
│ Beklenen komisyon: ₺ 412.000    │
├─────────────────────────────────┤
│ BUGÜN (9)                       │
│ 📞 Ayşe K. — FSBO, 3.gün  [ARA] │
│ 🏠 10:30 Gösterim Moda 3+1 [YOL]│
│ ✍️ Yetki imzası bekliyor   [GÖN]│
│ ⚠️ 2 ilanın EİDS onayı yok      │
│ 📉 Kadıköy 2+1: fiyat öneri     │
├─────────────────────────────────┤
│ HAT  Aday 14 │ Yayın 22 │ Teklif 3│
├─────────────────────────────────┤
│ 🏠  🔍  ➕  💬  👤             │
│ Kokpit Radar Ekle Mesaj Profil  │
└─────────────────────────────────┘
```
Ortadaki **➕** her yerden tek dokunuşla: *Portföy / Müşteri / Gösterim / Sesle Not / Fotoğraf çek*.

### 7.2 Portföy Kartı — Masaüstü
```
┌──────────────────────────────────────────────────────────────────────┐
│ ◀ Portföyler   Moda Mah. 3+1, 140 m²   ₺ 12.500.000   [Yayında ●]   │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ [Fotoğraf     │ Genel │ Tapu&Hukuk │ Medya │ Evrak │ │ SAĞLIK  82/100│
│  galerisi]    │ Eşleşmeler(7) │ Performans │ Geçmiş  │ • Kat planı yok│
│               ├──────────────────────────────────────┤ • Fiyat +%6    │
│               │ Ada/Parsel: 1234/5   İskân: ✔        ├───────────────┤
│               │ Tapu: Kat mülkiyeti  İpotek: ✖       │ UYUM          │
│               │ Krediye uygun: ✔     DASK: ✔ (2027)  │ Yetki ✔ 23 gün│
│               │ Malik: 2 kişi (%50/%50) EİDS ✔       │ EİDS ✔        │
├───────────────┴──────────────────────────────────────┤ KVKK ✔        │
│ Kanal: sahibinden 1.240 👁 18 📞 │ hepsiemlak 610 👁 4 │ [Mal sahibine │
│ Gösterim 6 • Teklif 1 • Ort. geri bildirim 4.1/5     │  rapor gönder]│
└──────────────────────────────────────────────────────┴───────────────┘
```

### 7.3 FSBO Radar
```
┌─────────────────────────────────────────────────────────────────┐
│ FSBO Radar   Bölge: Kadıköy ▾  Tip: Daire ▾  Skor ≥ 60 ▾        │
├──────┬──────────────────────┬─────────┬──────┬────────┬─────────┤
│ Skor │ İlan                 │ Fiyat   │ Yaş  │ Düşüş  │ Aksiyon │
├──────┼──────────────────────┼─────────┼──────┼────────┼─────────┤
│  91  │ Fenerbahçe 3+1 "acil"│ 9,8 M   │ 47 g │ 2 kez  │ [ARA]   │
│  84  │ Caddebostan 2+1      │ 7,2 M   │ 33 g │ 1 kez  │ [ARA]   │
│  72  │ Göztepe 4+1 dubleks  │ 14,5 M  │ 12 g │ –      │ [ATA ▾] │
└──────┴──────────────────────┴─────────┴──────┴────────┴─────────┘
 Harita ⟷ Liste   |   Bugünkü arama sırası: 12   |   Senaryo: [Aç]
```

### 7.4 İşlem Hattı (Kanban)
```
 Aday(14)   Değerleme(5)  Yetki(8)   Yayında(22)  Teklif(3)  Kapora(2)  Tapu(1)
 ┌──────┐   ┌──────┐      ┌──────┐   ┌──────┐     ┌──────┐   ┌──────┐   ┌──────┐
 │ kart │   │ kart │      │ kart │   │ kart │     │ kart │   │ kart │   │ kart │
 └──────┘   └──────┘      └──────┘   └──────┘     └──────┘   └──────┘   └──────┘
 Sürükle-bırak → aşama geçişinde uyum motoru çalışır (ör. "Yayında"ya geçiş = yetki + EİDS)
```

### 7.5 Navigasyon Yapısı
- **Mobil (danışman):** Kokpit · Radar · ➕ · Mesajlar · Profil (+ çekmece menü: Portföy, Müşteri, Takvim, Sözleşme, Finans, Rapor)
- **Web (ofis/broker):** Sol menü — Kokpit, Portföy, Müşteriler, FSBO Radar, Eşleştirme, İşlemler, Takvim, İlanlar, Pazarlama, Sözleşmeler, Finans, Raporlar, Ağ/MLS, Ayarlar
- **Global arama (⌘K):** Telefon numarası, ada/parsel, isim, ilan no, adres — hepsini arar.

### 7.6 Görsel Dil
- Sade, yoğun bilgi; kartlar; durum renkleri: **yeşil** (tamam), **amber** (dikkat), **kırmızı** (engel/gecikme), **mavi** (bilgi).
- Açık/koyu tema, büyük dokunma alanları (min 44 px), Türkçe öncelikli, çok dil (EN/AR/RU/DE) müşteri yüzlü ekranlarda.
- Franchise markası tema değişkenleriyle (renk, logo, font) uygulanır; ofis/danışman değiştiremez.

---

## 8. Veri Modeli

### 8.1 Ana Varlıklar (ER özet)
```
Organizasyon (Merkez) 1─* Ofis 1─* Takım 1─* Kullanıcı(Danışman)
Ofis 1─* YetkiBelgesi
Kullanıcı 1─* Portföy *─* Malik(Kişi)
Portföy 1─* Medya, 1─* Belge, 1─* Ilan(Kanal), 1─* FiyatGecmisi, 1─1 EidsKaydi
Portföy 1─* YetkiSozlesmesi
Kişi 1─* Talep(Arayış)  ── Eslesme ──  Portföy
Kişi 1─* Aktivite (arama, mesaj, not, gösterim)
Gösterim *─1 Portföy, *─1 Kişi, 1─1 YerGostermeBelgesi
Teklif *─1 Portföy, *─1 Kişi  →  Islem(Transaction) 1─* KontrolAdimi
Islem 1─* KomisyonKalemi *─1 Kullanıcı ;  Islem 1─* Fatura
FsboIlan *─1 Mulk(tekil) → (dönüşünce) Portföy
Kural(versiyonlu) 1─* UyumKaydi *─1 (herhangi bir varlık)
RizaKaydi *─1 Kişi (KVKK/İYS)
DenetimIzi (tüm varlıklar, değişmez)
```

### 8.2 Örnek Şema Parçaları
```sql
-- Portföy
portfolio (
  id uuid pk, office_id, owner_agent_id, status, listing_type, property_type,
  price numeric, currency, gross_m2, net_m2, rooms, floor, total_floors,
  building_age, heating, il, ilce, mahalle, ada, parsel, bagimsiz_bolum,
  deed_type, has_iskan bool, encumbrances jsonb, zoning jsonb,
  loan_eligible bool, geo geography(Point), share_level, health_score int,
  created_at, updated_at
)

authorization_contract (
  id, portfolio_id, type {exclusive|non_exclusive}, commission_rate,
  start_date, end_date, signed_at, signature_method, document_id, rule_version
)

eids_record (portfolio_id, request_at, approved_at, eids_ref, status)

showing (
  id, portfolio_id, client_id, agent_id, scheduled_at, status,
  viewing_certificate_id, checkin_geo, feedback jsonb
)

commission_split (
  transaction_id, party, base_amount, rate, vat, amount, recipient_user_id
)

consent (person_id, channel, purpose, granted bool, source, granted_at, revoked_at)
```

### 8.3 Arama & Coğrafya
- PostGIS: poligon ile bölge arama, mesafe, isokron (X dk sürüş).
- Tam metin arama (Türkçe dil analizörü; "ğ/ş/ı" normalize).

---

## 9. Teknik Mimari

### 9.1 Önerilen Yığın
| Katman | Teknoloji | Gerekçe |
|---|---|---|
| Mobil | **React Native (Expo)** | iOS+Android tek kod, çevrimdışı (WatermelonDB/SQLite), kamera, konum |
| Web | **Next.js (React, TypeScript)** | Ofis paneli + herkese açık ilan/ofis siteleri (SEO) |
| API | **Node.js (NestJS) TypeScript** | Mobil/web ile ortak tip sistemi, modüler yapı |
| Veritabanı | **PostgreSQL + PostGIS** | İlişkisel + coğrafi sorgu |
| Arama | OpenSearch / Meilisearch | Hızlı filtreli arama, Türkçe analiz |
| Kuyruk/İş | Redis + BullMQ | FSBO tarama, ilan senkronu, bildirimler |
| Dosya | S3 uyumlu depolama (TR bölgesi) + CDN | Fotoğraf/video/belge |
| Kimlik | OIDC (Keycloak / Auth0) + OTP | SSO franchise, danışmana MFA |
| Bildirim | FCM/APNs, SMS sağlayıcı, WhatsApp Business API | |
| AI | LLM API (metin, özet, sınıflandırma) + görüntü modelleri | §12 |
| Gözlem | OpenTelemetry, Sentry, Grafana | |

### 9.2 Mimari Şema
```
 [Mobil App] [Web Panel] [Müşteri Portalı] [Ofis Web Siteleri]
        \         |            |                 /
         └──────── API Gateway (auth, rate limit) ─────┐
                          │                             │
   ┌──────────┬───────────┼───────────┬────────────┐    │
   ▼          ▼           ▼           ▼            ▼    ▼
 Portföy   CRM/Eşleş.  İşlem/Söz.  Finans/Fatura  İletişim  Uyum Motoru
   │          │           │           │            │        │
   └──────────┴─────┬─────┴───────────┴────────────┴────────┘
                    ▼
      PostgreSQL+PostGIS · Arama · Redis · Nesne Depo
                    │
          Olay Veri Yolu (outbox → kuyruk)
                    │
  ┌─────────┬───────┴───────┬──────────────┬─────────────┐
  ▼         ▼               ▼              ▼             ▼
Portal    FSBO Radar     AI Servisleri   Bildirim     Entegrasyon
Senkron   İşçileri       (metin/görsel)  Servisi      Adaptörleri
```
- Başlangıçta **modüler monolit** (tek dağıtım, net modül sınırları); ölçek gerektiren işçiler (FSBO, medya işleme, portal senkronu) ayrı servis.
- **Çok kiracılı (multi-tenant):** Satır düzeyi güvenlik (PostgreSQL RLS) ile organizasyon/ofis izolasyonu.
- **Çevrimdışı-önce mobil:** Yerel DB + çakışma çözümü (son yazan kazanır + alan bazlı birleştirme; kritik alanlarda kullanıcıya sor).
- **Veri yerleşimi:** KVKK gereği Türkiye'de barındırma (yurt dışı aktarım kısıtları).

---

## 10. Entegrasyonlar

| Alan | Entegrasyon | Not |
|---|---|---|
| İlan portalları | sahibinden, hepsiemlak, emlakjet, zingat vb. | Resmî kurumsal API/XML feed; iş ortaklığı gerektirir |
| Kamu | e-Devlet / EİDS, TKGM Parsel Sorgu, Web Tapu randevu, e-İmar (belediye) | Mümkün olan yerde yönlendirme/derin bağlantı; doğrudan API erişimi olmayanlarda manuel doğrulama adımı |
| Veri | TÜİK TÜFE, TCMB kurlar ve faiz | Kira artışı, döviz, kredi simülasyonu |
| İletişim | WhatsApp Business API, SMS, e-posta, sanal santral, İYS | |
| Finans | e-Fatura/e-Arşiv entegratörü, sanal POS, muhasebe (Logo, Mikro, Paraşüt) | |
| İmza | OTP imza, e-imza / mobil imza sağlayıcıları | |
| Takvim/Harita | Google/Outlook Takvim, Google Maps / Yandex / HERE | Rota, isokron |
| Sosyal | Meta (Instagram/Facebook), Google İşletme, YouTube | Otomatik paylaşım |
| Kredi | Banka/kredi danışmanlığı iş ortakları | Ön onay yönlendirmesi |
| Sigorta | DASK / konut sigortası acenteleri | Çapraz satış geliri |

---

## 11. Güvenlik, KVKK ve Denetim

- Tüm trafik TLS; hassas alanlar (TCKN, telefon, adres) **alan düzeyinde şifreleme**; loglarda maskeleme.
- **Görünürlük katmanları:** Ortak portföyde mal sahibi iletişimi yalnızca portföy sahibine açık.
- **Değişmez denetim izi:** Kim, neyi, ne zaman gördü/değiştirdi; özellikle kişi verisi erişimi ve dışa aktarımlar.
- **Toplu dışa aktarma kontrolü:** Danışman ayrılırken müşteri listesini topluca indiremez (ofis politikası).
- **Danışman ayrılışı:** Kayıtların devri iş akışı (portföy/müşteri yeni sahibe).
- Yedekleme (RPO 15 dk, RTO 4 saat), felaket kurtarma bölgesi (TR içi).
- Sızma testi, OWASP ASVS L2 hedefi, cihaz kaybında uzaktan oturum sonlandırma.

---

## 12. Yapay Zekâ Katmanı

| Özellik | Açıklama | Kontrol |
|---|---|---|
| İlan metni yazarı | Veri + fotoğraftan kanal bazlı metin, çeviri | Mevzuat/ayrımcılık filtresi, danışman onayı zorunlu |
| Fotoğraf iyileştirme | Işık, perspektif, sıralama, kapak seçimi | Gerçeği değiştirmeyen düzeltmeler |
| Sanal mobilya | Boş odayı döşeme | "Temsilidir" filigranı zorunlu |
| Sesli not → görev | Görüşme özeti, aksiyon çıkarımı | Kullanıcı onaylı |
| Akıllı değerleme | Emsallerle fiyat aralığı ve satış süresi | Aralık + güven skoru; yasal değerleme değildir ibaresi |
| FSBO skoru | Mal sahibinin satış motivasyonu tahmini | Açıklanabilir sinyaller |
| Eşleştirme | Tercih öğrenen öneri | Filtre gerekçesi gösterilir |
| Kokpit önceliklendirme | "Bugün önce bunu yap" | Neden sıralandığı açıklanır |
| AI Asistan (sohbet) | "Kadıköy'de 10M altı, krediye uygun 3+1 portföyüm kaç?" | Yalnızca kullanıcının yetkili olduğu veri |
| Rol oyunu koçu | İtiraz karşılama pratiği | Eğitim modülü |

İlke: **AI önerir, danışman karar verir.** Müşteriye giden hiçbir içerik danışman onayı olmadan gönderilmez.

---

## 13. Yol Haritası (MVP → v3)

### Faz 0 — Temel (4–6 hafta)
Kimlik/rol, çok kiracılı yapı, tasarım sistemi, veri modeli, uyum motoru iskeleti, denetim izi.

### Faz 1 — MVP "Danışmanın Cebi" (8–10 hafta)
- Kokpit (Bugün listesi), Portföy kartı + medya, Müşteri/CRM + talep profili, basit Eşleştirme
- Takvim + gösterim + **dijital Yer Gösterme Belgesi**
- Yetki sözleşmesi şablonu + OTP imza, EİDS durum takibi (manuel adım)
- Komisyon & maliyet hesaplayıcıları, KVKK rıza kaydı
- Mobil (çevrimdışı temel) + Web panel

### Faz 2 — "Portföy Makinesi" (8 hafta)
FSBO Radar, Değerleme (CMA) raporu, mal sahibi haftalık raporu, ilan metni AI, çok kanallı yayın (ilk 2 portal), Pazarlama Stüdyosu şablonları, birleşik gelen kutusu (WhatsApp + SMS).

### Faz 3 — "Ofis & Ağ" (8 hafta)
İşlem hattı + kapanış kontrol listeleri, teklif yönetimi, komisyon paylaşım motoru, e-Fatura, ofis/ağ raporları, MLS paylaşımı, lead dağıtımı.

### Faz 4 — "Ötesi"
Müşteri portalı, kira/mülk yönetimi, sanal tur & sanal mobilya, AI asistan, akademi & rol oyunu, açık API, yabancı alıcı çok dilli portal.

---

## 14. Başarı Ölçütleri

| Metrik | Hedef (ilk 12 ay) |
|---|---|
| Danışman günlük aktif kullanım | ≥ %70 |
| Portföy girişinden yayına süre | < 15 dk |
| FSBO → yetki dönüşüm oranı | Mevcudun 2 katı |
| Lead ilk yanıt süresi | < 5 dk medyan |
| Belgesiz gösterim / yetkisiz ilan | 0 |
| Mal sahibi kaynaklı portföy kaybı | %30 azalma |
| Ortalama satış süresi | %20 kısalma |

---

## 15. Açık Sorular

1. **Hedef kitle önceliği:** Tek ofis mi (DC Emlak), yoksa baştan çok ofisli franchise ağı mı?
2. **Portal entegrasyonları:** Hangi portallarla kurumsal hesap/API erişimi var? FSBO Radar için veri kaynağı her platformun kullanım koşullarına uygun şekilde nasıl sağlanacak (iş ortaklığı, danışmanın kendi aramaları, manuel ekleme)?
3. **Platform önceliği:** Önce mobil mi, web mi? (Öneri: ikisi birlikte, mobil sahaya odaklı dar kapsamlı.)
4. **Mevcut veri:** Excel/eski CRM'den içe aktarılacak portföy ve müşteri verisi var mı?
5. **Komisyon modeli:** Ofiste kullanılan paylaşım oranları ve kademeleri neler?
6. **Marka:** Kurumsal kimlik (logo, renk, font) ve uygulama adı.
7. **Barındırma ve bütçe:** Türkiye içi bulut tercihi, aylık altyapı bütçesi.
8. **Hukuk onayı:** Sözleşme şablonlarını onaylayacak avukat/danışman.

---

*Sonraki adım:* Bu tasarım onaylandıktan sonra Faz 0 + Faz 1 için teknik iskelet (monorepo: `apps/mobile`, `apps/web`, `apps/api`, `packages/ui`, `packages/domain`) ve tıklanabilir arayüz prototipi hazırlanacaktır.
