# DC Emlak — Güvenlik Modeli

Bu belge uygulamanın yetki sınırlarını ve saldırılara karşı önlemlerini özetler. Kuralların tamamı **veritabanında** uygulanır; ekrandaki gizleme yalnızca kolaylıktır, tek güvence değildir.

## 1. Kiracı (ofis) izolasyonu
- Her kayıt bir ofise aittir. PostgreSQL satır düzeyi güvenliği (RLS) bir ofisin başka ofisin verisini okumasını, yazmasını ve oraya kayıt eklemesini engeller.
- Bir kullanıcı aynı anda yalnızca bir ofisin aktif üyesi olabilir.
- Ofis doğrudan oluşturulamaz; yalnızca `create_office` fonksiyonuyla, oluşturan kişi broker olarak eklenir.

## 2. Roller
| Yetki | Broker | Takım lideri | Asistan | Danışman |
|---|---|---|---|---|
| Tüm ofis müşterileri / portföyleri | ✔ | ✔ | ✔ | Yalnız kendi + paylaşılan portföyler |
| Ofis bilgileri, paket, ekip, davet, entegrasyon anahtarları | ✔ | — | — | — |
| Komisyon paylaşımını kaydetme | ✔ | — | — | — |
| Tahsilat işaretleme | ✔ | ✔ | — | — |
| İmzalı belgeyi iptal etme | ✔ | — | — | — |
| Müşteri silme | ✔ | — | — | — |
| Uyum (denetim) kayıtlarını okuma | ✔ | ✔ | — | — |

- Kimse kendi rolünü yükseltemez.
- Broker kendini düşüremez, pasifleştiremez ve üyeliğini silemez.

## 3. Belge ve imza bütünlüğü
- **Uzaktan imza bağlantısı:** Belirteç sunucuda üretilir (`open_for_signing`). Rastgeledir (≥ 244 bit), 14 gün geçerlidir ve tek kullanımlıktır. İstemci bu belirteci kendisi yazamaz.
- **İmza kanıtı:** Zaman damgası, cihaz bilgisi, IP ve belgenin SHA-256 özeti sunucuda üretilir. İmzalayanın tarayıcısından gelen değerler kanıt yerine geçmez.
- **İmzalayanın gördüğü:** Yalnızca belgenin kendisi. İç alanlar (`_kisi_id` vb.) gösterilmez.
- **İmza kayıtları:** Değiştirilemez ve silinemez. İstemci yalnızca ıslak imza kaydı ekleyebilir.
- **İmzalı belge:** Değiştirilemez; yalnızca broker iptal edebilir.
- **Silme ve saklama:** Belgeler silinemez. Saklama süresi kısaltılamaz.
- **İçerik değişirse:** İmzaya açık belgenin içeriği değişince bağlantı geçersiz olur.

## 4. Mevzuat kurallarının veritabanı güvencesi
- **Gösterim:** İmzalı yer gösterme belgesi olmadan gösterim "tamamlandı" yapılamaz.
- **KVKK rızaları:** Silinemez; yalnızca geri alınır. Geri alma kaydı saklanır.
- **Denetim kaydı:** Yalnızca kendi adına yazılır; değiştirilemez ve silinemez.
- **Aktivite kayıtları:** Yazarı, ofisi ve tarihi sonradan değiştirilemez.
- **Paket:** Deneme süresi bitince istemciden değiştirilemez (ödeme atlatma koruması).

## 5. Uygulama güvenliği
- **Güvenlik başlıkları:**
  - İçerik güvenlik politikası (CSP): betik ve bağlantılar yalnızca kendi alan adına ve Supabase'e açıktır.
  - `frame-ancestors 'none'`: tıklama hilesine (clickjacking) karşı.
  - HSTS, `nosniff` ve izin politikası (kamera kapalı; mikrofon ve konum yalnızca uygulamada).
  - İmza sayfasında: `no-referrer`, `no-store`, `noindex`.
- **Kullanıcı içeriği:** HTML olarak işlenmez; `dangerouslySetInnerHTML` kullanılmaz.
- **Bağlantılar:** Yalnızca `http(s)` bağlantılar tıklanabilir. Medya yalnızca ofis deposundaki dosyalara işaret edebilir.
- **Giriş yönlendirmesi:** `?next=` yalnızca uygulama içi adreslere yönlendirir.
- **Hata mesajları:** Veritabanı iç ayrıntıları kullanıcıya gösterilmez.
- **Service worker:** İmza bağlantılarını, davet kodlarını ve başarısız yanıtları önbelleğe almaz.
- **Demo modu:** Yayında Supabase ayarı yoksa uygulama kapanır. Demo yalnızca `NEXT_PUBLIC_DEMO=1` ile açılır.
- **Gizli anahtarlar:** Ücretli servis anahtarları Supabase Vault'ta şifreli durur. `service_role` anahtarı uygulamada kullanılmaz.
- **Bağımlılıklar:** `npm audit` taramasında açık yok.

## 6. Otomatik doğrulama
Her güncellemede CI şunları yapar:
- Tüm migration'ları temiz bir PostgreSQL'e uygular.
- `ci-supabase-security.sql` ile saldırı senaryolarını dener: başka ofis, yetki yükseltme, sahte imza, belge ve rıza değiştirme, anonim erişim, belgesiz gösterim, bedelsiz paket yükseltme.
- Senaryolardan biri başarılı olursa derleme kırmızıya döner.

## 7. Sorumluluğunuzda kalanlar
- Supabase'de `service_role` anahtarını hiçbir yere girmeyin.
- Auth → URL Configuration'da yalnızca kendi alan adınızı tanımlayın.
- Ekipten ayrılan kişiyi **Ayarlar → Ekip**'ten pasifleştirin.
- Düzenli olarak JSON yedek alın.
- Kritik kullanımda Supabase Pro'ya geçin: günlük yedek ve zaman noktasına geri dönüş (PITR).
