# Finans Takip

Kişisel gelir, gider ve yatırım takibi için basit bir web uygulaması (PWA).
Telefonun ana ekranına eklenip uygulama gibi kullanılabilir, internetsiz de açılır.

## Ne yapar

- Gelir, gider ve yatırım kaydı (tutar, tarih, açıklama; gider için kategori)
- Ay bazlı özet: gelir, gider, yatırım ve kalan
- Toplam varlık (tüm zamanlar)
- Aylar arasında geçmişe gezinme
- Kayıt silme
- Aylık bütçe hedefleri: kategori başına limit (Rapor sekmesi), Özet'te
  dolan ilerleme çubukları
- Yinelenen işlemler: kira, maaş, abonelik gibi her ay tekrarlayan
  işlemler. Uygulama bunları kendiliğinden eklemez; zamanı gelince
  Özet'in üstündeki panelde "onayla / atla" diye sorar
- Grafikler: ayın gider dağılımı (kategori halkası) ve son 6 ayın
  gelir-gider karşılaştırması — hazır kütüphane yok, el yapımı SVG
- Yedekleme: kayıtları JSON dosyası olarak indirme ve geri yükleme
- Yedek hatırlatıcısı: en son ne zaman yedek alındığını gösterir, bir
  aydan uzun süre geçmişse uyarı rengine döner

## Nasıl çalıştırılır

Kurulum yok, paket yok, derleme adımı yok.

```
npx --yes serve -l 3000 .
```

Sonra tarayıcıda: http://localhost:3000

> Doğrudan `index.html` dosyasına çift tıklayarak da açılır ama o zaman
> service worker çalışmaz (tarayıcı kuralı: `https://` veya `localhost` gerekir),
> yani çevrimdışı çalışma ve "ana ekrana ekle" devre dışı kalır.

## Testler

```
node testler.js
```

Hiçbir kurulum gerektirmez. İki iş yapar:

1. `veri.js`'in hesaplarını gerçek değerlerle sınar (para çevirme, ay
   filtresi, toplamlar, saat dilimi tuzakları, ondalık hatası)
2. Dosyaların birbiriyle uyumunu denetler: JavaScript'in aradığı her
   `id`/sınıf HTML'de var mı, script sırası doğru mu, renkler tek yerde
   mi, service worker'ın önbellek listesindeki her dosya gerçekten var mı

## Dosyalar

| Dosya | İşi |
|---|---|
| `index.html` | Sayfanın iskeleti |
| `style.css` | Görünüm. Tüm renkler ve ölçüler `:root` içinde değişken olarak |
| `veri.js` | Kasa: para, tarih, saklama, hesaplama. Ekranı hiç bilmez |
| `app.js` | Arayüz: çizer, düğmeleri dinler. Hesabı `veri.js`'e sorar |
| `service-worker.js` | Çevrimdışı çalışma (önce internet, olmazsa önbellek) |
| `manifest.json` | PWA kimlik kartı: ad, ikon, nasıl açılacağı |
| `testler.js` | Testler ve tutarlılık denetimleri |
| `icons/` | Ana ekran ikonları (192, 512, maskable-512, iOS için 180) |

## Veriler nerede saklanıyor

Tarayıcının `localStorage`'ında, cihazın kendisinde. Sunucuya hiçbir şey
gitmiyor, bu depoda hiçbir finansal veri yok.

Bunun sonucu: veriler **cihaza ve adrese özel**. Telefonda girdiklerin
bilgisayarda görünmez; tarayıcı verisini temizlersen ya da telefon
değiştirirsen kayıtlar gider. Sigortası Özet ekranındaki **Yedekleme**
bölümü: kayıtları JSON dosyası olarak indirir, gerekirse geri yükler.
Arada bir yedek almak kullanıcının sorumluluğunda — o yüzden aynı
bölümde "son yedek: N gün önce" satırı duruyor ve bir ayı geçince
uyarı rengine dönüyor.

Ek bir önlem olarak uygulama açılışta tarayıcıdan kalıcı depo izni
(`navigator.storage.persist()`) ister: "cihazda yer daralınca benim
verimi silme" ricası. Cevabı garanti değildir ve karar tarayıcınındır,
bu yüzden asıl sigorta hep elde duran yedek dosyasıdır.

## Teknik notlar

- Para her zaman **kuruş cinsinden tam sayı** olarak saklanır (`1.250,50 TL`
  → `125050`). Ondalıklı sayılarla toplama yapmak `0.1 + 0.2 = 0.300000000004`
  gibi hatalar üretir.
- Tarihler yerel saate göre üretilir. `new Date().toISOString()` Greenwich
  saatini verir ve Türkiye'de akşam 21:00'den sonraki kayıtları düne yazar.
- Tüm yollar **göreli** (`./`). GitHub Pages siteyi `kullanici.github.io/depo-adi/`
  altında yayınladığı için `/` ile başlayan yollar kırılır.
