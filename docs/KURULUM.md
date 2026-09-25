# DC Emlak — Canlıya Alma Rehberi

Bu rehber, teknik bilgisi olmayan bir ofis sahibinin DC Emlak'ı **ücretsiz katmanlarla** (Supabase + Vercel) kendi alan adında çalıştırması için adım adım yazılmıştır. Toplam süre: yaklaşık 30–45 dakika.

> Görsel anlatım için: [Tanıtım sunumu (PDF)](sunum/DC-Emlak-Tanitim.pdf) — kurulum ve tüm modüller ekran görüntüleriyle.

> İhtiyacınız olanlar: bir e-posta adresi, bir GitHub hesabı (ücretsiz), DC Emlak kodunun GitHub'daki kopyası (depo).

---

## 1) Veritabanı: Supabase (ücretsiz)

### 1.1 Proje oluşturun
1. <https://supabase.com> → **Start your project** → GitHub veya e-postayla kaydolun.
2. **New project** → ad: `dc-emlak`, güçlü bir veritabanı şifresi belirleyin (bir yere not edin).
3. **Region**: `Central EU (Frankfurt)` önerilir (Türkiye'ye en yakın).
4. Proje hazırlanana kadar (1–2 dk) bekleyin.

### 1.2 Tabloları kurun (migration'lar)
1. Sol menüden **SQL Editor** → **New query**.
2. Depodaki `app/supabase/migrations/` klasöründeki dosyaları **numara sırasıyla** (0001, 0002, 0003 …) açın; her birinin içeriğini kopyalayıp editöre yapıştırın ve **Run** deyin.
3. Her dosya "Success. No rows returned" benzeri bir mesajla bitmelidir. Hata alırsanız bir sonraki dosyaya geçmeyin (bkz. Sorun giderme).

> `.github/workflows/ci-supabase-stub.sql` dosyasını Supabase'de **çalıştırmayın**; o yalnızca otomatik testler içindir.

### 1.3 Vault (API anahtarları için)
**Database → Extensions** → `supabase_vault` açık olmalı (yeni projelerde varsayılan olarak açıktır). SMS, WhatsApp gibi ücretli servis anahtarları burada şifreli saklanır.

### 1.4 E-posta ile giriş
1. **Authentication → Sign In / Providers → Email**: *Enable Email provider* açık, **Confirm email** açık kalsın.
2. **Authentication → Emails → Templates → Magic Link** şablonuna 6 haneli kodu ekleyin, böylece kullanıcılar bağlantı yerine kodu da yazabilir:
   ```html
   <h2>DC Emlak giriş</h2>
   <p>Giriş kodunuz: <strong>{{ .Token }}</strong></p>
   <p>veya <a href="{{ .ConfirmationURL }}">buraya tıklayarak giriş yapın</a>.</p>
   ```
   Aynı şablonu **Confirm signup** için de uygulayın (ilk girişte bu şablon gider).
3. Ücretsiz katmanda Supabase'in e-posta gönderimi saatte birkaç e-postayla sınırlıdır. Ekip büyüdüğünde **Authentication → Emails → SMTP Settings** bölümünden kendi SMTP'nizi (ör. Resend, Brevo ücretsiz katman) tanımlayın.

### 1.5 Adres ayarları (Vercel kurulumundan sonra dönün)
**Authentication → URL Configuration**:
- **Site URL**: `https://<vercel-adresiniz>.vercel.app` (veya kendi alan adınız)
- **Redirect URLs**: `https://<vercel-adresiniz>.vercel.app/**` ekleyin. Yerel deneme için `http://localhost:3000/**`.

### 1.6 Anahtarları not edin
**Project Settings → API** (veya **Data API**):
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> `service_role` anahtarını **asla** Vercel'e veya uygulamaya girmeyin; tüm yetkileri atlar.

---

## 2) Uygulama: Vercel (ücretsiz)

1. <https://vercel.com> → GitHub ile giriş yapın.
2. **Add New… → Project** → DC Emlak deposunu **Import** edin.
3. **Root Directory**: `app` seçin (önemli!). Framework otomatik "Next.js" olarak algılanır.
4. **Environment Variables** bölümüne ekleyin:
   | Ad | Değer |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 1.6'daki Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1.6'daki anon key |
5. **Deploy**. 2–3 dakika sonra `https://…vercel.app` adresiniz hazır.
6. Bu adresi Supabase'de **Site URL / Redirect URLs** olarak girin (1.5).
7. (İsteğe bağlı) **Settings → Domains** ile kendi alan adınızı (ör. `app.dcemlak.com`) bağlayın ve Supabase'deki adresleri güncelleyin.

> Ortam değişkenlerini değiştirdiğinizde Vercel'de **Deployments → Redeploy** yapın; `NEXT_PUBLIC_` değerleri derleme sırasında gömülür.

---

## 3) İlk giriş, ofis kurulumu, ekip daveti

1. Adresinizi açın → **Giriş** ekranında e-postanızı yazın → gelen e-postadaki bağlantıya tıklayın **veya** 6 haneli kodu girin.
2. İlk girişte **Ofis kurulumu** açılır: unvan, vergi no, MERSİS, taşınmaz ticareti **yetki belgesi no ve geçerlilik tarihi**, adınız ve paket (Temel / Profesyonel / Premium — 14 gün ücretsiz deneme). Ofisi kuran kişi **broker** (yönetici) olur.
3. **Ayarlar → Ekip → Davet kodu oluştur**: rolü seçin (danışman, asistan, takım lideri), kodu **WhatsApp ile gönder**. Kod 7 gün geçerli ve tek kullanımlıktır.
4. Davet edilen kişi bağlantıyı açar, kendi e-postasıyla giriş yapar ve **Davet koduyla katıl** sekmesinde kodu girer.
5. Telefonda: tarayıcı menüsünden **Ana ekrana ekle** — uygulama gibi açılır (PWA).

---

## 4) İsteğe bağlı ücretli entegrasyonlar

**Ayarlar → Entegrasyonlar**: SMS, WhatsApp Business API, Yapay Zekâ, e-İmza, e-Fatura.
- Temel/Profesyonel pakette **kendi anahtarınızla** açılır: sağlayıcıdan (ör. Netgsm, Meta Cloud API) hesap açın, API anahtarını girin. Anahtar **Supabase Vault**'ta şifrelenir, tabloda yalnızca referansı durur.
- Kapalıyken uygulama ücretsiz karşılıklarla çalışır (wa.me bağlantısı, telefonun SMS uygulaması, bağlantı + kodla imza onayı, taslak PDF fatura).
- Premium pakette servisler kota dâhilinde gelir (ödeme altyapısı iyzico/PayTR adaptörü sonraki sürümde).

---

## 5) KVKK, yedekleme ve güvenlik notları

- **Yurt dışına aktarım:** Supabase (AB) ve Vercel (global) sunucuları yurt dışındadır. KVKK md. 9 gereği aydınlatma metninize yurt dışı aktarımı ekleyin; Kurul'a standart sözleşme bildirimi yapın ya da açık rıza alın. Hukuk danışmanınızla teyit edin.
- **VERBİS:** Veri Sorumluları Sicili'ne kayıt yükümlülüğünüzü (verbis.kvkk.gov.tr) kontrol edin.
- **Aydınlatma / rıza:** Müşteri kartlarında aydınlatma onayı ve İYS ticari ileti izni kaydedilmeden pazarlama iletisi gönderilmez (Uyum Motoru).
- **Yedek:** Ücretsiz Supabase katmanında otomatik yedek/geri dönüş sınırlıdır. **Ayarlar → Veri & KVKK → Tüm ofis verisini indir** ile haftalık JSON yedek alın ve şifreli bir yerde saklayın. Kritik kullanımda Supabase Pro (günlük yedek + PITR) önerilir.
- **Etkin olmayan proje:** Ücretsiz Supabase projeleri 7 gün hiç kullanılmazsa duraklatılır; panelden tek tıkla yeniden başlatılır, veri silinmez.
- **Erişim:** Danışman yalnızca kendi kayıtlarını ve ofisle paylaşılan portföyleri görür; broker tüm ofisi görür (satır düzeyi güvenlik — RLS). Ayrılan danışmanı **Ayarlar → Ekip**'ten pasifleştirin.
- **Mevzuat parametreleri:** **Ayarlar → Parametreler**'de "Teyit gerekli" işaretli değerler (tapu döner sermaye, MASAK eşiği) canlı kullanımdan önce güncel kaynaklardan doğrulanmalıdır.

---

## 6) Demo modu

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` tanımlı değilse uygulama **demo modunda** açılır:
- Giriş gerekmez, örnek "DC Emlak Kadıköy" ofisi yüklenir.
- Tüm değişiklikler yalnızca o tarayıcıda (localStorage) saklanır; başka cihaz veya kişi görmez.
- **Ayarlar → Veri & KVKK → Demo verisini sıfırla** ile başa dönülür.
- Sunum ve eğitim için idealdir; gerçek müşteri verisi girmeyin.

Yerel çalıştırma (geliştiriciler için): `cd app && npm ci && npm run dev` → <http://localhost:3000>.

---

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Giriş e-postası gelmiyor | Spam klasörü; Supabase ücretsiz e-posta limiti (saatte birkaç e-posta) — biraz bekleyin veya kendi SMTP'nizi tanımlayın (1.4). |
| E-postadaki bağlantı "localhost"a gidiyor | Supabase **Site URL / Redirect URLs** Vercel adresinize ayarlı değil (1.5). |
| Kod "geçersiz veya süresi dolmuş" | Son gelen e-postadaki kodu kullanın; kod ~1 saat geçerlidir. |
| Kurulumda "Veritabanı kurulumu eksik" | `0002_onboarding.sql` çalıştırılmamış. SQL Editor'de migration'ları sırayla çalıştırın. |
| Migration'da `type "plan_id" already exists` | Dosya daha önce çalıştırılmış; bir sonrakine geçin. Emin değilseniz yeni boş projede baştan kurun. |
| Anahtar kaydederken "Supabase Vault etkin değil" | Database → Extensions → `supabase_vault` açın. |
| Uygulama hâlâ "Demo modu" diyor | Vercel ortam değişkenleri eksik/yanlış ya da değişiklikten sonra **Redeploy** yapılmadı. |
| Vercel derlemesi "No Next.js version detected" | **Root Directory** `app` olarak ayarlanmamış. |
| Danışman bazı kayıtları göremiyor | Beklenen davranış: danışman yalnız kendi kayıtlarını görür; rolü **Ayarlar → Ekip**'ten değiştirilebilir. |
