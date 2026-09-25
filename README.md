# DC Emlak

Emlak ofisleri için SaaS: portföy, FSBO, müşteri, eşleştirme, ilan, sözleşme, komisyon ve mevzuat uyumu tek ekranda. Telefon ve masaüstünde çalışan PWA; ücretsiz katmanlarla (Supabase + Vercel) kurulur.

- 🎞️ Tanıtım sunumu (kurulumdan kullanıma, 48 slayt): [PowerPoint](docs/sunum/DC-Emlak-Tanitim.pptx) · [PDF](docs/sunum/DC-Emlak-Tanitim.pdf)
- 🚀 Canlıya alma (adım adım, teknik bilgi gerektirmez): [docs/KURULUM.md](docs/KURULUM.md)
- 🧩 Uygulama (Next.js PWA + Supabase), komutlar ve klasör yapısı: [app/README.md](app/README.md)
- 🔒 Güvenlik modeli ve yetki sınırları: [docs/GUVENLIK.md](docs/GUVENLIK.md)
- 📐 Ürün ve sistem tasarımı: [docs/TASARIM.md](docs/TASARIM.md)
- 🖱️ Tıklanabilir prototip: [prototype/index.html](prototype/index.html)

## Modüller

Kokpit · Portföyler · Müşteriler (CRM + KVKK rıza) · Takvim & Yer Gösterme Belgesi · FSBO Radar · Eşleştirme · İşlem hattı & komisyon · Sözleşmeler · Raporlar · Excel içe aktarma · Hesaplayıcılar · Ayarlar & Paket (ofis, ekip daveti, paketler, entegrasyonlar, veri dışa aktarma)

## Hızlı deneme

```bash
cd app && npm ci && npm run dev   # Supabase olmadan demo modunda açılır
```
