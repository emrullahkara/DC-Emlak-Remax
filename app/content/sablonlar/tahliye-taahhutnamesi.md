---
baslik: "Tahliye Taahhütnamesi"
kod: "tahliye-taahhutnamesi"
surum: "2026.09-taslak"
durum: "Taslak — hukuk onayı bekliyor"
zorunlu_alanlar:
  - taahhut_tarihi
  - kira_sozlesmesi_tarihi
  - teslim_tarihi
  - kiraci_ad_soyad
  - kiraci_tckn
  - kiraci_adres
  - kiraya_veren_ad_soyad
  - kiraya_veren_tckn
  - tasinmaz_acik_adres
  - ada
  - parsel
  - bagimsiz_bolum_no
  - tahliye_tarihi
opsiyonel_alanlar:
  - kiraci2_ad_soyad
  - kiraci2_tckn
kontroller:
  - "taahhut_tarihi > teslim_tarihi (taahhüt, kiralananın tesliminden SONRA verilmelidir)"
  - "taahhut_tarihi != kira_sozlesmesi_tarihi (sözleşmeyle aynı gün/aynı belgede alınmamalı)"
  - "tahliye_tarihi > taahhut_tarihi"
dayanak:
  - "6098 sayılı Türk Borçlar Kanunu md. 352/1 (kiracının yazılı tahliye taahhüdü)"
  - "2004 sayılı İcra ve İflas Kanunu md. 272 vd. (tahliye taahhüdüne dayalı icra takibi — teyit edilmeli)"
  - "Yargıtay içtihatları (taahhüdün teslimden sonra verilmesi, tarihlerin belirliliği — teyit edilmeli)"
---

> **TASLAK — Hukuk onayı bekliyor.** Bu şablon genel bilgilendirme amaçlıdır; kullanılmadan önce bir avukat tarafından güncel mevzuata göre kontrol edilmelidir.

# TAHLİYE TAAHHÜTNAMESİ

**Taahhüt Tarihi:** {{taahhut_tarihi}}

**Kiraya Veren:** {{kiraya_veren_ad_soyad}} — T.C. Kimlik No: {{kiraya_veren_tckn}}

**Kiracı:** {{kiraci_ad_soyad}} — T.C. Kimlik No: {{kiraci_tckn}} — Adres: {{kiraci_adres}}
**Kiracı (2):** {{kiraci2_ad_soyad}} — T.C. Kimlik No: {{kiraci2_tckn}}

**Kiralanan:** {{tasinmaz_acik_adres}} — {{ada}} ada, {{parsel}} parsel, {{bagimsiz_bolum_no}} no.lu bağımsız bölüm

---

Kiraya veren ile aramda **{{kira_sozlesmesi_tarihi}}** tarihli kira sözleşmesi bulunan ve tarafıma **{{teslim_tarihi}}** tarihinde teslim edilmiş olan yukarıda adresi yazılı taşınmazı, **{{tahliye_tarihi}}** tarihinde, hiçbir ihtar ve ihbara gerek kalmaksızın, boş ve teslim aldığım şekilde tahliye ederek anahtarlarını kiraya verene teslim edeceğimi;

bu taahhüdü kendi özgür irademle, herhangi bir baskı altında kalmaksızın ve kiralananın tesliminden sonra verdiğimi;

taahhüt ettiğim tarihte tahliye etmemem hâlinde kiraya verenin, TBK md. 352/1 uyarınca tahliye tarihinden itibaren bir ay içinde icra takibi yapmak veya dava açmak suretiyle kira sözleşmesini sona erdirebileceğini bildiğimi

kabul, beyan ve taahhüt ederim.

| KİRACI | KİRACI (2) |
|---|---|
| {{kiraci_ad_soyad}} | {{kiraci2_ad_soyad}} |
| İmza: | İmza: |

---

## Geçerlilik Notları (belgenin çıktısına eklenmez; uygulama içi kontrol ve kullanıcı uyarısıdır)

1. **Yazılı şekil:** Taahhüt yazılı olmalı ve kiracı tarafından imzalanmalıdır. Kiracının ıslak imzası (veya nitelikli elektronik imzası) aranmalıdır; OTP ile onay bu belge için **yeterli kabul edilmemelidir** (teyit edilmeli).
2. **Teslimden sonra verilmesi:** Yargıtay içtihatlarına göre kira sözleşmesiyle birlikte veya kiralananın tesliminden önce alınan tahliye taahhüdü, kiracının baskı altında olduğu karinesiyle geçersiz sayılabilir. Bu nedenle `taahhut_tarihi`, `teslim_tarihi`'nden **sonra** olmalıdır. Uygulama bu koşul sağlanmadığında imzayı engeller.
3. **Tarihlerin belirliliği:** Hem taahhüdün düzenlenme tarihi hem de tahliye tarihi açıkça ve kesin olarak yazılmalıdır. Boş bırakılıp sonradan doldurulan tarihler uyuşmazlık konusu olur; boş tarihli taahhüt **alınmamalıdır**.
4. **İspat:** Taahhüdün düzenlenme tarihinin ispatı için noter onayı veya imzaların tarihli şekilde belgelenmesi tavsiye edilir.
5. **Bir aylık süre:** Kiraya veren, taahhüt edilen tahliye tarihinden itibaren **bir ay içinde** icra takibi başlatmaz veya dava açmazsa, sözleşme bir yıl uzamış sayılabilir ve taahhüde dayanma imkânı o dönem için ortadan kalkabilir (teyit edilmeli).
6. **Kiracı sayısı:** Birden fazla kiracı varsa taahhüdün tüm kiracılarca verilmesi gerekir. Eş tarafından verilen taahhüdün aile konutu yönünden etkisi hukuk danışmanınca değerlendirilmelidir (teyit edilmeli).
7. **Arabuluculuk:** Tahliye taahhüdüne dayalı icra takibinin dava şartı arabuluculuk kapsamı dışında olup olmadığı güncel mevzuata göre teyit edilmelidir.

---
*Belge kodu: tahliye-taahhutnamesi · Sürüm 2026.09-taslak · Hukuk onayı bekliyor*
