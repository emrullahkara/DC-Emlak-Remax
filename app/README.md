# DC Emlak — Uygulama (Faz 0–1 iskeleti)

Next.js (App Router, TypeScript) PWA + Supabase. Tasarım: [`../docs/TASARIM.md`](../docs/TASARIM.md).

## Çalıştırma

```bash
npm install
cp .env.example .env.local   # Supabase anahtarları (boş bırakılırsa demo veriyle çalışır)
npm run dev                  # http://localhost:3000
```

| Komut | Açıklama |
|---|---|
| `npm test` | Alan (domain) birim testleri — Vitest |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm run build` | Üretim derlemesi |

## Klasör yapısı

```
src/
  domain/            Saf iş kuralları (UI ve veritabanından bağımsız, test edilir)
    params.ts          Versiyonlu mevzuat parametreleri (oranlar kodda sabit değil)
    commission.ts      Hizmet bedeli (yasal tavan kontrolü) ve paylaşım
    costs.ts           Alıcı toplam maliyeti, satıcı net tutarı
    rent.ts            TÜFE'ye göre azami kira, depozito sınırı, 5/10 yıl tarihleri
    compliance.ts      Uyum Motoru: ilan yayını, gösterim, ileti, sözleşme, kapanış
    pipeline.ts        İşlem hattı aşamaları ve geçiş kapıları
    matching.ts        Portföy ↔ müşteri eşleştirme puanı
    scoring.ts         FSBO sıcaklık skoru, portföy sağlık skoru
  lib/
    plans.ts           SaaS paketleri (Temel / Profesyonel / Premium) ve özellik kapıları
    integrations/      Ücretli servis adaptörleri (SMS, WhatsApp, AI, e-imza) + ücretsiz karşılıkları
    supabase/          Supabase istemcisi
    demo.ts            Supabase bağlanana kadar örnek veri
  app/                 Sayfalar: Kokpit (/), Hesaplayıcılar (/hesaplayicilar), PWA manifest
supabase/migrations/   PostgreSQL + PostGIS şeması, çok kiracılı RLS politikaları
public/sw.js           Service worker (çevrimdışı uygulama kabuğu)
```

## Supabase kurulumu (ücretsiz katman)

1. supabase.com'da proje oluşturun.
2. SQL Editor'de `supabase/migrations/0001_init.sql` dosyasını çalıştırın (veya `supabase db push`).
3. Project Settings → API'den URL ve anon key'i `.env.local` dosyasına yazın.

> Mevzuat oranları `src/domain/params.ts` içindedir. `teyitGerekli: true` işaretli değerler (döner sermaye, MASAK eşiği) canlıya çıkmadan önce güncel kaynaklardan girilmelidir.
