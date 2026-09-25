# DC Emlak — Uygulama

Next.js 15 (App Router, TypeScript, Tailwind v4) PWA + Supabase. Tasarım: [`../docs/TASARIM.md`](../docs/TASARIM.md) · Canlıya alma: [`../docs/KURULUM.md`](../docs/KURULUM.md).

## Çalıştırma

```bash
npm ci
cp .env.example .env.local   # Supabase anahtarları (boş bırakılırsa demo modunda çalışır)
npm run dev                  # http://localhost:3000
```

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Birim testleri (Vitest) — alan kuralları, Kokpit, doğrulamalar |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Üretim derlemesi / sunucusu |

CI (`.github/workflows/ci.yml`) her push ve PR'da lint, tip, test ve derlemeyi çalıştırır; ayrıca tüm `supabase/migrations/*.sql` dosyalarını boş bir PostgreSQL 16'ya sırayla uygular ve ofis kurulumu/davet/RLS duman testini koşar.

## Çalışma modları

- **Demo** (Supabase ortam değişkenleri yok): giriş gerekmez; örnek ofis verisi tarayıcıda (localStorage) tutulur. Ayarlar → Veri & KVKK'dan sıfırlanır.
- **Supabase**: e-posta ile giriş (sihirli bağlantı + 6 haneli kod), ofis kurulumu, çok kiracılı RLS.

Oturum durumları (`src/data/session.tsx`): `loading` → `anon` (→ `/giris?next=…`) → `no_office` (→ `/kurulum`) → `ready`.

## Ekranlar

| Yol | Modül |
|---|---|
| `/` | Kokpit — bugünün öncelikli aksiyonları, aylık hedef, beklenen komisyon, satış hattı, uyum uyarıları |
| `/giris` | E-posta ile giriş (Supabase OTP), demo modunda açıklama |
| `/kurulum` | Ofis kurulumu (paket seçimi, 14 gün deneme) veya davet koduyla katılım |
| `/ayarlar` | Ofis & yetki belgesi, Ekip & davet, Paket, Entegrasyonlar, Veri & KVKK, Parametreler |
| `/portfoyler`, `/musteriler`, `/takvim`, `/fsbo`, `/eslestirme`, `/islemler`, `/sozlesmeler`, `/raporlar`, `/iceri-aktar` | Portföy, CRM, takvim/gösterim, FSBO Radar, eşleştirme, işlem hattı, sözleşmeler, raporlar, içe aktarma |
| `/hesaplayicilar` | Hizmet bedeli, maliyet, kira artışı hesaplayıcıları |

## Klasör yapısı

```
src/
  domain/            Saf iş kuralları (UI/veritabanından bağımsız, Vitest ile test edilir)
    params.ts          Versiyonlu mevzuat parametreleri
    compliance.ts      Uyum Motoru: ilan yayını, gösterim, ileti, sözleşme, kapanış
    kokpit.ts          Kokpit aksiyon üretici, beklenen komisyon, hedef
    commission.ts, costs.ts, rent.ts, pipeline.ts, matching.ts, scoring.ts
  data/              Veri katmanı: tipler, LocalStore/SupabaseStore, oturum, demo verisi
  components/        ui.tsx (ortak bileşenler), AppShell/AppNav, modül bileşenleri (kokpit/, ayarlar/ …)
  lib/               plans.ts (paketler), integrations/ (ücretli servis adaptörleri), format.ts, supabase/
  app/               Sayfalar (App Router)
supabase/migrations/ PostgreSQL şeması + RLS
  0001_init.sql        Tablolar ve satır düzeyi güvenlik
  0002_onboarding.sql  create_office / create_invite / accept_invite RPC'leri, office_invite,
                       Vault'lu entegrasyon anahtarları, korumalı alan tetikleyicileri
public/sw.js         Service worker (çevrimdışı uygulama kabuğu)
```

## Notlar

- Mevzuat oranları `src/domain/params.ts` içindedir. `teyitGerekli: true` işaretli değerler (döner sermaye, MASAK eşiği) canlıya çıkmadan önce güncel kaynaklardan girilmelidir.
- `office` tablosuna doğrudan INSERT kapalıdır; ofis yalnızca `create_office` RPC'siyle oluşturulur. `deneme_bitis` istemciden değiştirilemez (tetikleyici).
- Ücretli servis anahtarları Supabase Vault'ta şifrelenir (`set_integration_secret`); tabloda yalnızca Vault referansı tutulur.
