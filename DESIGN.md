---
version: alpha
name: Finans Takip
description: Telefon cebinde duran kisisel gelir-gider defteri; tek sutun, sakin acik tema, tek vurgu rengi. Kaynak dogrulugu style.css'tir - bu dosya onun sozlesme ozetidir.

colors:
  primary: "#007f73"           # kodda --vurgu; iki yonlu kontrast: zeminde 4.53, ustunde beyaz 4.90
  primary-active: "#00625a"    # --vurgu-koyu; basili hal
  primary-tint: "#f2fbf9"      # --vurgu-solgun; vurgulu kutu zemini
  surface: "#f4f6f8"           # --zemin; sayfa
  card: "#ffffff"              # --kart; kutular ve beyaz yazi rengi
  border: "#e6eaee"            # --kenar
  pressed: "#eef1f4"           # --bastirilmis; basili gri hal
  on-surface: "#14181d"        # --yazi
  on-surface-muted: "#5b636c"  # --yazi-soluk; zeminde 5.63
  on-surface-faint: "#6a7179"  # --yazi-cok-soluk; zeminde 4.56
  income: "#008229"            # --gelir; 4.59
  expense: "#cf2020"           # --gider; 5.00
  expense-on-dark: "#f87171"   # --gider-acik; yalniz koyu panel ustunde
  investment: "#4f46e5"        # --yatirim
  warning: "#b55300"           # --uyari; butce "yaklasiyor" + eski yedek; 4.61
  dark-panel: "#14181d"        # --koyu; varlik kutusu zemini (tek ters blok)
  dark-panel-text: "#98a2ad"   # --koyu-yazi
  error-bg: "#fdecec"
  error-border: "#f3bdbd"
  error-text: "#a01c1c"
  success-bg: "#e7f7f1"
  success-border: "#a9dfcb"
  success-text: "#0b6b4f"
  chart-1: "#0ea5e9"           # --kategori-1..8: sira veri.js KATEGORILER listesine KILITLI
  chart-2: "#f59e0b"
  chart-3: "#8b5cf6"
  chart-4: "#ef4444"
  chart-5: "#10b981"
  chart-6: "#ec4899"
  chart-7: "#64748b"
  chart-8: "#a16207"

typography:
  body:
    fontFamily: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.45
  input:
    fontSize: 20px             # --girdi-punto; DOKUNULMAZ - iOS zoom kurali, gerekce style.css'te
  page-title:
    fontSize: 19px
    fontWeight: 700
    letterSpacing: -0.2px
  hero-number:
    fontSize: clamp(25px, 8vw, 32px)
    fontWeight: 700
    letterSpacing: -0.8px
  label-upper:
    fontSize: 12px
    fontWeight: 600
    letterSpacing: 0.3px

rounded:
  sm: 6px                      # onay kutusu
  md: 8px                      # form ic alanlari
  button: 10px                 # kucuk dugmeler (sil, ekle/atla)
  lg: 12px                     # --yuvarlak; standart kutu
  xl: 18px                     # --yuvarlak-buyuk; yalniz varlik kutusu
  pill: 999px                  # yalniz butce cubugu rayi/dolgusu

spacing:
  page-width: 480px            # --sayfa-genislik
  page-gutter: 16px            # --sayfa-bosluk
  list-gap: 8px
  card-gap: 10px
  card-padding: 14px
  section-gap: 24px
  bottom-clearance: 76px       # + env(safe-area-inset-bottom)

components:
  button-primary:              # .kaydet
    background: "{colors.primary}"
    textColor: "{colors.card}"
    fontSize: 16px
    fontWeight: 700
    rounded: "{rounded.lg}"
    padding: 16px
    active-background: "{colors.primary-active}"
  button-secondary:            # .tekrar-atla, .yedek-dugme, .ay-ok
    background: "{colors.card}"
    textColor: "{colors.on-surface-muted}"
    border: "1px solid {colors.border}"
    active-background: "{colors.pressed}"
    minHeight: 44px
  delete-button:               # .sil, .sablon-sil
    size: 44px
    opacity: 0.4
    active-background: "{colors.error-bg}"
  card:                        # .kart
    background: "{colors.card}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
    accent: "border-left 4px (tur rengi)"
  input:                       # .alan input/select
    fontSize: "{typography.input}"
    background: "{colors.card}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    focus-border: "{colors.primary}"
  budget-bar:                  # .butce-cubuk
    height: 8px
    rounded: "{rounded.pill}"
    states: "iyi={colors.primary} uyari={colors.warning} asildi={colors.expense}"
  tab-bar:                     # .alt-bar
    position: fixed-bottom
    background: "{colors.card}"
    border-top: "1px solid {colors.border}"
    active-indicator: "inset 0 2px 0 {colors.primary}"
---

## Overview

Finans Takip, Neo'nun telefonunda yaşayan kişisel gelir-gider defteri.
Somut referans: **bir bankacılık uygulamasının sakinliğinde cep defteri** —
tek sütun (480px), açık gri zemin üstünde beyaz kartlar, tek vurgu rengi
(teal), en üstte tek koyu "varlık" bloğu. Süs yok, gölge yok, maskot yok.
Kullanım bağlamı acımasız: güneş altında, yürürken, yorgun gözle —
bu yüzden her renk ölçülerek seçildi, her dokunma hedefi 44px.

Bu dosya **mevcut** görünümün sözleşmesidir; kaynak doğruluğu her zaman
`style.css`'tir (satır içi gerekçeleriyle). Çelişki görürsen style.css
kazanır ve bu dosya güncellenir.

## Colors

- `{colors.primary}` (#007f73) — tek vurgu: aktif sekme, seçili tür,
  kaydet düğmesi, focus çerçevesi, "iyi" bütçe çubuğu. **İki yönlü
  kontrast şartı taşır:** zemin üstünde yazı olarak 4,5+; zemini olduğu
  beyaz yazıyla 4,5+. Değiştirilecekse iki yön de yeniden hesaplanır.
- Tür renkleri sabit üçlü: `{colors.income}` yeşil · `{colors.expense}`
  kırmızı · `{colors.investment}` indigo. Kart sol şeridi, tutar rengi ve
  grafik bu üçlüden beslenir.
- `{colors.expense-on-dark}` yalnız koyu panel üstünde — koyu zeminde
  normal kırmızı kaybolur.
- `{colors.chart-1..8}` halka grafiğin dilimleri; sıra `veri.js`
  KATEGORILER listesine kilitli — kategori rengi aydan aya DEĞİŞMEZ.
- **Renk asla JavaScript'ten gelmez** — app.js yalnız sınıf ekler/çıkarır,
  bütün renkler style.css değişkenlerinden.
- **Kontrast göze değil hesaba dayanır:** normal metin ≥ 4,5:1. Bu proje
  bunu bir kez acıyla öğrendi (üç renk 2026-08-10 denetiminde değişti).

## Typography

- Font **indirilmez**: `system-ui` yığını. Sebep çift: açılış hızı ve
  çevrimdışı çalışma (PWA). Yeni font eklemek yasak.
- Gövde 15px/1,45. Sayfa başlığı 19px/700. Etiketler 12-13px/600.
- **Girdi alanları 20px — dokunulmaz.** iOS, görünen punto 16'nın altına
  düşerse sayfayı kendiliğinden yakınlaştırır (Safari %85 ölçeklemesiyle
  17px bile yetmiyordu; cihazda ölçüldü). Gerekçenin tamamı style.css'te.
- **Her sayı `tabular-nums`** — tutar değişince yazı zıplamaz. Büyük
  tutarlar `clamp()` ile esner, satırdan taşmaz.

## Layout

- Tek sütun, `max-width: 480px`, ortalanmış; kenarlarda 16px.
- Dikey ritim: liste elemanları arası 8px, kartlar arası 10px, bölümler
  arası 24px. Kart içi dolgu 14px (varlık kutusu 20/22px).
- Sayfa dibinde 76px + `env(safe-area-inset-bottom)` boşluk — sabit alt
  çubuk içeriği örtmesin.
- Üç sekme: Özet / Ekle / Rapor. Sekme içerikleri `.gizli` sınıfıyla
  değişir; sayfa yeniden yüklenmez.

## Elevation & Depth

- **Gölge yok.** Hiyerarşi üç araçla kurulur: 1px `{colors.border}`
  kenarlık, zemin farkı (gri sayfa / beyaz kart / solgun teal vurgu kutusu)
  ve tek koyu blok (varlık kutusu — sayfanın tek ters-kontrast alanı).
- Tek istisna: odaklı girdinin `box-shadow: 0 0 0 3px rgba(...)` halkası —
  o gölge değil, focus göstergesi.
- Alet çantası bölgeleri (yedekleme) kesikli kenarlıkla ayrılır — "burası
  günlük akış değil" işareti.

## Shapes

- Standart kutu `{rounded.lg}` 12px; varlık kutusu `{rounded.xl}` 18px
  (yalnız o); küçük düğmeler 10px; form iç alanı 8px; onay kutusu 6px.
- Pill (`999px`) yalnız bütçe çubuğunda. Başka yerde pill kullanma.

## Components

- **Varlık kutusu** — koyu panel; küçük CAPS etiket + `clamp` dev sayı.
  Eksi bakiye `{colors.expense-on-dark}` olur (sınıfı app.js ekler).
- **Özet kartları** — 2 sütun grid; sol 4px tür şeridi; "Bu ay kalan"
  kartı `{colors.primary-tint}` zeminle öne çıkar, eksiyse tutar kırmızı.
- **Kayıt satırı** — beyaz kutu: açıklama (taşarsa ellipsis) + alt bilgi
  soluk 12px + sağda tutar (tür renginde) + 44×44 soluk çöp düğmesi
  (opacity 0.4; yanlış basmanın bedeli yüksek, göze batmasın).
- **"Zamanı gelenler" paneli** — solgun teal zemin + teal kenarlık:
  "dikkat çeksin ama bağırmasın". İçinde Ekle (vurgulu) / Atla (soluk) —
  44px; ikisi farklı iş yapar, yanlış dokunma = yanlış veri.
- **Bütçe çubuğu** — 8px ray; üç durum: iyi/uyarı/aşıldı. **Renk tek
  kanal değildir:** sayı ve yüzde hemen üstünde yazar.
- **Tür seçici** — 3'lü grid radyo; seçili olan teal dolgu + beyaz yazı.
  Radyo görsel olarak gizli ama klavye/ekran okuyucu için yerinde.
- **Alt sekme çubuğu** — sabit; aktif sekme teal + üstte 2px iç çizgi
  (inset shadow — yükseklik oynamaz). Klavye açıkken tamamen gizlenir
  (`body.yazi-yaziliyor`) — iOS klavye/fixed-bar çakışması dersi.
- **Bildirim/hata kutuları** — yeşil aile başarı, kırmızı aile hata;
  her ikisi metin taşır, yalnız renkle konuşmaz.

## Do's and Don'ts

Bizim şartlar (değişmez beşli):

1. **Açık tema** — koyu tema önerilmez, üretilmez.
2. **Türkçe UI metni** — arayüz Türkçe; kod/sınıf adları da bu projede Türkçe.
3. **Mobil öncelik** — önce 360-390px telefon, sonra gerisi.
4. **iOS girdi tabanı 20px** — düşürülmez; tırmandırılmaz da (22-24 çirkinleştirir; sorun dönerse viewport tarafına bakılır).
5. **Sayı disiplini** — tutarlar `tabular-nums`; hizada zıplama yok.

Proje kuralları:

- Do: yeni bir ihtiyaçta ÖNCE mevcut renk ailesinden çöz (tekrar paneli
  ve eski-yedek uyarısı böyle yapıldı). Don't: yeni hex ekleme — eklemek
  zorundaysan kontrastını hesapla ve style.css'e gerekçesiyle yaz.
- Do: her dokunma hedefi ≥ 44×44px. Don't: "kenarlıkla 44 oluyor" hesabı
  (border-box'ta kenarlık içeride — bir kez yanıldık, ölçüldü).
- Do: geçişler 0.12-0.2s, yalnız background/color/opacity.
  Don't: hareket animasyonu, parallax, konfeti.
- Don't: hover'a davranış bağlama — bu bir dokunmatik uygulama; basılı
  hâl `:active` ile verilir.
- Don't: harici kütüphane, CDN, font, ikon seti eklemek. Grafikler el
  yazması SVG'dir ve öyle kalır.

## Responsive Behavior

- Tek sütun her genişlikte; geniş ekranda 480px blok ortada durur.
  Masaüstüne özel düzen bilinçli olarak YOK.
- Dev sayılar `clamp()` ile esner; kart tutarları sığmazsa `nowrap` kalır
  ve punto küçülür, satır kırılmaz.
- Trend listesi dar ekranda `flex-wrap` ile alt satıra iner.
- `prefers-reduced-motion: reduce` → bütün geçişler kapanır.

## Accessibility & Interaction States

- Focus: `outline: 2px {colors.primary}` + 2px offset, yalnız
  `:focus-visible` (fare tıklamasında çerçeve çıkmaz).
- Basılı hâller: teal → `{colors.primary-active}`; gri düğmeler →
  `{colors.pressed}`; sil → hata zemini + opacity 1.
- Boş durumlar metinlidir: "bu ay kayıt yok", grafik boşsa açıklama satırı.
- Durum bilgisi hiçbir yerde tek başına renge binmez (bütçe: sayı+yüzde;
  tür: metin+şerit; yedek yaşı: metin).
- Kontrast tabanı: normal metin ≥ 4,5:1 — mevcut değerlerin hepsi ölçülü,
  değerlerin yanında oranları yazılı.

## Assets & Implementation Boundaries

- İkonlar `icons/` PNG'leridir (192/512/maskable-512) — yeniden üretilmez.
- PWA kimliği: `manifest.json` → `theme_color: #007f73`,
  `background_color: #f4f6f8`. Renk değişirse manifest de değişir.
- Grafikler el yazması SVG (app.js üretir, renkler CSS'ten). Grafik
  kütüphanesi EKLENMEZ.
- Emoji arayüz simgesi olarak kullanılır (çöp kutusu vb.) — ikon fontu yok.

## Iteration & Verification

- Bir seferde TEK component/bölüm değiştir.
- Her görünüm değişikliğinden sonra: `node --check app.js` + testler
  (`testler.js`, 740 sınama) + telefon genişliğinde gözle bakış.
- Renk değişikliği = kontrast yeniden hesaplanır (iki yönlü kural dahil).
- Punto/viewport değişikliği = gerçek cihazda doğrulanır (tani.html
  yöntemi; 2026-08-11 dersi: tahmin değil ölçüm).

## Known Gaps

- Hover hâlleri bilinçli tanımsız (dokunmatik ürün); masaüstünde fare
  ile gezen kullanıcı yalnız `:active` görür.
- Masaüstü/tablet düzeni bilinçli yok — tek sütun karar, eksik değil.
- Safari sayfa ölçeği %80'in altına inerse (bir sonraki kademe %75)
  20px girdi kuralı yetmeyebilir; o gün çare viewport tarafında aranır,
  punto tırmandırılmaz (style.css sınır notu).
- `[TAHMIN]` Bu dosya style.css'ten elle çıkarıldı (2026-08-12); ileride
  ikisi arasında kayma olursa doğru olan style.css'tir — sahibi: Morpheus,
  her UI dokunuşunda eşleşme kontrol edilir.
