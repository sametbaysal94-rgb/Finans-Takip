// testler.js — projenin kendi kendini sınaması.
//
// ÇALIŞTIRMAK İÇİN:  node testler.js
//
// İki iş yapar:
//   1) veri.js'in fonksiyonlarını gerçek değerlerle sınar (hesap doğru mu?)
//   2) index.html / app.js / style.css birbiriyle uyumlu mu diye bakar
//      (JavaScript'in aradığı bir id HTML'de yok mu, script sırası doğru mu...)
//
// Hiçbir kurulum gerekmiyor: sadece Node yeterli, indirilen paket yok.
// Her şey yolundaysa çıkış kodu 0, bir sorun varsa 1 olur.

const fs = require("fs");
const path = require("path");

// ============================================================
// TARAYICI TAKLİDİ
// ============================================================
//
// veri.js tarayıcı için yazıldı ve localStorage kullanıyor.
// Node'da localStorage yok, o yüzden aynı işi yapan minik bir taklit
// koyuyoruz: getItem / setItem. Bu sayede testler gerçek dosyayı
// çalıştırıyor — kopyasını değil.
globalThis.localStorage = {
  _kutu: {},
  getItem(anahtar) {
    return Object.prototype.hasOwnProperty.call(this._kutu, anahtar) ? this._kutu[anahtar] : null;
  },
  setItem(anahtar, deger) {
    this._kutu[anahtar] = String(deger);
  },
  removeItem(anahtar) {
    delete this._kutu[anahtar];
  },
};

const V = require("./veri.js");

function depoyuTemizle() {
  // İki rafı da boşaltıyoruz: v2 (güncel) ve v1 (kurtarma kopyası).
  // Sadece v2'yi silseydik, taşıma testlerinden kalan v1 verisi sonraki
  // testlere sızardı.
  localStorage.removeItem(V.DEPO_ANAHTARI);
  localStorage.removeItem(V.ESKI_ANAHTAR);
}

// ============================================================
// KÜÇÜK TEST ARACI
// ============================================================

let gecen = 0;
let basarisiz = 0;

function baslik(metin) {
  console.log("\n== " + metin + " ==");
}

function esit(ad, gercek, beklenen) {
  // Object.is: NaN === NaN yanlış döner, Object.is(NaN, NaN) doğru döner.
  const ok = Object.is(gercek, beklenen);
  if (ok) {
    gecen++;
    console.log(`  OK    ${ad}  ->  ${gercek}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}  ->  ${gercek}   (beklenen: ${beklenen})`);
  }
}

function dogru(ad, kosul) {
  esit(ad, kosul === true, true);
}

function hataAtmali(ad, fn) {
  try {
    fn();
    basarisiz++;
    console.log(`  HATA  ${ad}  ->  hata atmasi gerekirdi, atmadi`);
  } catch (e) {
    gecen++;
    console.log(`  OK    ${ad}  ->  "${e.message}"`);
  }
}

// ============================================================
// 1) PARA ÇEVİRME
// ============================================================

baslik("tlToKurus — yazıyı kuruşa çevirme");
esit("1250", V.tlToKurus(1250), 125000);
esit('"1250,50"', V.tlToKurus("1250,50"), 125050);
esit('"1.250,50"', V.tlToKurus("1.250,50"), 125050);
esit('"1250.50"', V.tlToKurus("1250.50"), 125050);
// Binlik nokta, virgül yok — bir zamanlar 1,25 TL sanılıyordu (bin kat hata!)
esit('"1.250" (binlik nokta, 125 kuruş DEĞİL)', V.tlToKurus("1.250"), 125000);
esit('"12.500"', V.tlToKurus("12.500"), 1250000);
esit('"1.250.000" (milyon, eskiden reddediliyordu)', V.tlToKurus("1.250.000"), 125000000);
esit('"1.5" (binlik kalıbına uymaz, ondalık kalır)', V.tlToKurus("1.5"), 150);
esit("19.99 (ondalık hatası olmamalı)", V.tlToKurus(19.99), 1999);
esit('"  99,9  " (boşluklar)', V.tlToKurus("  99,9  "), 9990);
esit('"" (boş)', V.tlToKurus(""), NaN);
esit('"abc"', V.tlToKurus("abc"), NaN);

baslik("kurusYaz — kuruşu ekran yazısına çevirme");
esit("125050", V.kurusYaz(125050), "1.250,50 ₺");
esit("0", V.kurusYaz(0), "0,00 ₺");
esit("1234567890", V.kurusYaz(1234567890), "12.345.678,90 ₺");
esit("-50000 (eksi)", V.kurusYaz(-50000), "-500,00 ₺");

// ============================================================
// 2) TARİH VE AY
// ============================================================

baslik("tarih ve ay yardımcıları");
dogru("bugununTarihi biçimi yyyy-aa-gg", /^\d{4}-\d{2}-\d{2}$/.test(V.bugununTarihi()));
dogru("bugununTarihi bugünün yerel günü", V.bugununTarihi().endsWith(String(new Date().getDate()).padStart(2, "0")));
esit("bugununAyi().ay 1-12 arası", V.bugununAyi().ay >= 1 && V.bugununAyi().ay <= 12, true);
esit("ayEtiketi(2026, 8)", V.ayEtiketi(2026, 8), "2026-08");
esit("ayEtiketi(2026, 12)", V.ayEtiketi(2026, 12), "2026-12");

// Ay adı Türkçe geliyor mu? Büyük/küçük harf tarayıcı sürümüne göre
// değişebiliyor, o yüzden küçük harfe çevirip karşılaştırıyoruz
// (baş harfi büyütme işini CSS yapıyor: text-transform: capitalize).
console.log("        [bilgi] ayAdi(2026, 8) =", JSON.stringify(V.ayAdi(2026, 8)));
esit("ayAdi(2026, 8)", V.ayAdi(2026, 8).toLocaleLowerCase("tr"), "ağustos 2026");
esit("ayAdi(2026, 1)", V.ayAdi(2026, 1).toLocaleLowerCase("tr"), "ocak 2026");

baslik("ayKaydir — yıl geçişi doğru mu?");
esit("Ağustos +1 -> Eylül", V.ayEtiketi(V.ayKaydir(2026, 8, 1).yil, V.ayKaydir(2026, 8, 1).ay), "2026-09");
esit("Aralık +1 -> gelecek yıl Ocak", V.ayEtiketi(V.ayKaydir(2026, 12, 1).yil, V.ayKaydir(2026, 12, 1).ay), "2027-01");
esit("Ocak -1 -> geçen yıl Aralık", V.ayEtiketi(V.ayKaydir(2026, 1, -1).yil, V.ayKaydir(2026, 1, -1).ay), "2025-12");
esit("Ağustos -12 -> bir yıl önce", V.ayEtiketi(V.ayKaydir(2026, 8, -12).yil, V.ayKaydir(2026, 8, -12).ay), "2025-08");

baslik("ayniAy — iki ay nesnesi aynı mı?");
dogru("aynı ay", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2026, ay: 8 }));
dogru("farklı ay", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2026, ay: 9 }) === false);
dogru("farklı yıl", V.ayniAy({ yil: 2026, ay: 8 }, { yil: 2025, ay: 8 }) === false);

baslik("tarihYaz — liste satırındaki tarih");
esit('"2026-08-06"', V.tarihYaz("2026-08-06"), "6 Ağustos");
esit('"2026-01-01"', V.tarihYaz("2026-01-01"), "1 Ocak");
esit('"2026-12-31"', V.tarihYaz("2026-12-31"), "31 Aralık");
// Ayın ilk günü, saat dilimi kaymasının en kolay yakalandığı yer:
// yanlış yapılsaydı "31 Temmuz" çıkardı.
esit("ayın 1'i geriye kaymıyor", V.tarihYaz("2026-08-01"), "1 Ağustos");

baslik("turAdi — ekranda gösterilen tür adı");
esit("gelir", V.turAdi("gelir"), "Gelir");
esit("gider", V.turAdi("gider"), "Gider");
esit("yatirim", V.turAdi("yatirim"), "Yatırım");

// ============================================================
// 3) KAYIT EKLEME VE SİLME
// ============================================================

depoyuTemizle();

baslik("boş depo");
esit("başlangıçta kayıt sayısı", V.kayitlariOku().length, 0);
esit("boş depoda toplam varlık", V.toplamVarlik(V.kayitlariOku()), 0);

baslik("kayitEkle");
const gelir1 = V.kayitEkle({ tur: "gelir", tutar: 45000, tarih: "2026-08-01", aciklama: "Maaş" });
esit("gelir kuruş", gelir1.kurus, 4500000);
esit("gelirde kategori boş", gelir1.kategori, "");
dogru("kimlik üretildi", gelir1.id.length > 5);

const gider1 = V.kayitEkle({ tur: "gider", tutar: "1.250,50", tarih: "2026-08-03", aciklama: "Haftalık", kategori: "Market" });
esit("gider kuruş", gider1.kurus, 125050);
esit("gider kategori", gider1.kategori, "Market");

const gider2 = V.kayitEkle({ tur: "gider", tutar: 300, tarih: "2026-08-04" });
esit("kategori boş bırakılırsa", gider2.kategori, "Diğer");

const yatirim1 = V.kayitEkle({ tur: "yatirim", tutar: 5000, tarih: "2026-08-05" });
esit("yatırım kuruş", yatirim1.kurus, 500000);

dogru("tarih boş -> bugün", /^\d{4}-\d{2}-\d{2}$/.test(V.kayitEkle({ tur: "gelir", tutar: 1 }).tarih));
esit("toplam kayıt", V.kayitlariOku().length, 5);

baslik("bozuk veri reddedilmeli");
hataAtmali("geçersiz tür", () => V.kayitEkle({ tur: "hediye", tutar: 100 }));
hataAtmali("tutar 0", () => V.kayitEkle({ tur: "gelir", tutar: 0 }));
hataAtmali("tutar negatif", () => V.kayitEkle({ tur: "gelir", tutar: -50 }));
hataAtmali("tutar yazı", () => V.kayitEkle({ tur: "gelir", tutar: "abc" }));
hataAtmali("geçersiz tarih biçimi", () => V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "06.08.2026" }));
hataAtmali("geçersiz kategori", () => V.kayitEkle({ tur: "gider", tutar: 10, kategori: "Tatil" }));
esit("bozuklar depoya girmedi", V.kayitlariOku().length, 5);

baslik("kayitSil");
esit("var olanı sil", V.kayitSil(gider1.id), true);
esit("kayıt sayısı azaldı", V.kayitlariOku().length, 4);
esit("olmayanı sil", V.kayitSil("boyle-bir-id-yok"), false);
esit("kayıt sayısı değişmedi", V.kayitlariOku().length, 4);

baslik("kalıcılık (sayfa yenilenmiş gibi)");
const ham = localStorage.getItem(V.DEPO_ANAHTARI);
esit("depoda metin var", typeof ham, "string");
// Rafta artık kök nesne duruyor; kayıtlar onun .kayitlar bölümünde.
esit("metinden geri okunan sayı", JSON.parse(ham).kayitlar.length, 4);

baslik("bozuk depo uygulamayı çökertmemeli");
localStorage.setItem(V.DEPO_ANAHTARI, "{bu gecerli json degil");
// veri.js burada bilerek console.error basıyor; test çıktısı kirlenmesin
// diye o tek satırı geçici olarak susturuyoruz.
const eskiHataYazici = console.error;
console.error = () => {};
esit("boş dizi dönmeli", V.kayitlariOku().length, 0);
console.error = eskiHataYazici;

localStorage.setItem(V.DEPO_ANAHTARI, JSON.stringify({ dizi: "degil" }));
console.error = () => {};
esit("dizi olmayan veri -> boş dizi", V.kayitlariOku().length, 0);
console.error = eskiHataYazici;

baslik("kayitlariYaz + kayitlariOku — yazılan aynen geri okunuyor mu?");
depoyuTemizle();
V.kayitlariYaz([
  { id: "a1", tur: "gelir", kurus: 123456, tarih: "2026-08-01", aciklama: "elle yazıldı", kategori: "" },
]);
const geriOkunan = V.kayitlariOku();
esit("kayıt sayısı", geriOkunan.length, 1);
esit("kuruş bozulmadı", geriOkunan[0].kurus, 123456);
esit("Türkçe açıklama bozulmadı", geriOkunan[0].aciklama, "elle yazıldı");
esit("kimlik bozulmadı", geriOkunan[0].id, "a1");

// ============================================================
// 4) HESAPLAMALAR
// ============================================================

depoyuTemizle();

// Bilinen bir senaryo kuruyoruz, sonuçları elle hesaplayıp karşılaştırıyoruz.
//
// AĞUSTOS 2026
//   gelir   50.000,00
//   gider    1.200,00 + 800,00 = 2.000,00
//   yatırım 10.000,00
//   kalan   50.000 - 2.000 - 10.000 = 38.000,00
//
// TEMMUZ 2026
//   gelir   40.000,00
//   gider   45.000,00
//   kalan   40.000 - 45.000 = -5.000,00  (eksi!)
//
// TÜM ZAMANLAR
//   varlık  (50.000 + 40.000) - (2.000 + 45.000) = 43.000,00
//   yatırım 10.000,00
V.kayitEkle({ tur: "gelir", tutar: 50000, tarih: "2026-08-01" });
V.kayitEkle({ tur: "gider", tutar: 1200, tarih: "2026-08-10", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 800, tarih: "2026-08-20", kategori: "Fatura" });
V.kayitEkle({ tur: "yatirim", tutar: 10000, tarih: "2026-08-25" });
V.kayitEkle({ tur: "gelir", tutar: 40000, tarih: "2026-07-01" });
V.kayitEkle({ tur: "gider", tutar: 45000, tarih: "2026-07-15", kategori: "Kira" });

const tum = V.kayitlariOku();

baslik("ayKayitlari — doğru ayı süzüyor mu?");
esit("Ağustos 2026 kayıt sayısı", V.ayKayitlari(tum, 2026, 8).length, 4);
esit("Temmuz 2026 kayıt sayısı", V.ayKayitlari(tum, 2026, 7).length, 2);
esit("Eylül 2026 (kayıt yok)", V.ayKayitlari(tum, 2026, 9).length, 0);
esit("2025 Ağustos (yıl karışmasın)", V.ayKayitlari(tum, 2025, 8).length, 0);

baslik("ozetHesapla — Ağustos 2026");
const ag = V.ozetHesapla(tum, 2026, 8);
esit("gelir", V.kurusYaz(ag.gelir), "50.000,00 ₺");
esit("gider", V.kurusYaz(ag.gider), "2.000,00 ₺");
esit("yatırım", V.kurusYaz(ag.yatirim), "10.000,00 ₺");
esit("kalan (gelir-gider-yatırım)", V.kurusYaz(ag.kalan), "38.000,00 ₺");

baslik("ozetHesapla — Temmuz 2026 (kalan eksiye düşüyor)");
const tem = V.ozetHesapla(tum, 2026, 7);
esit("gelir", V.kurusYaz(tem.gelir), "40.000,00 ₺");
esit("gider", V.kurusYaz(tem.gider), "45.000,00 ₺");
esit("yatırım (yok)", tem.yatirim, 0);
esit("kalan eksi", V.kurusYaz(tem.kalan), "-5.000,00 ₺");
dogru("kalan gerçekten sıfırdan küçük", tem.kalan < 0);

baslik("ozetHesapla — kayıt olmayan ay sıfır dönmeli");
const eylul = V.ozetHesapla(tum, 2026, 9);
esit("gelir", eylul.gelir, 0);
esit("gider", eylul.gider, 0);
esit("yatırım", eylul.yatirim, 0);
esit("kalan", eylul.kalan, 0);

baslik("tüm zamanlar");
esit("toplam varlık", V.kurusYaz(V.toplamVarlik(tum)), "43.000,00 ₺");
esit("toplam yatırım", V.kurusYaz(V.toplamYatirim(tum)), "10.000,00 ₺");
esit("turToplami boş dizide", V.turToplami([], "gelir"), 0);

baslik("yeniyeGoreSirala — liste sıralaması");
// Sırasız bir dizi kuruyoruz; sonuç yeniden eskiye olmalı.
const sirasiz = [
  { id: "a", tarih: "2026-08-05", tur: "gelir", kurus: 100 },
  { id: "b", tarih: "2026-08-20", tur: "gelir", kurus: 100 },
  { id: "c", tarih: "2026-08-01", tur: "gelir", kurus: 100 },
  { id: "d", tarih: "2026-08-20", tur: "gelir", kurus: 100 }, // b ile aynı gün, sonra eklendi
];
const sirali = V.yeniyeGoreSirala(sirasiz);
esit("sıra", sirali.map((k) => k.id).join(""), "dbac");
esit("aynı günde sonra eklenen üstte", sirali[0].id, "d");
esit("en eski en altta", sirali[3].id, "c");
// Sıralama gelen diziyi bozmamalı: dışarıdaki kod "ben sıralamadım ki" demesin.
esit("özgün dizi bozulmadı", sirasiz.map((k) => k.id).join(""), "abcd");
esit("boş dizi", V.yeniyeGoreSirala([]).length, 0);

baslik("kuruş toplama ondalık hatası üretmiyor");
depoyuTemizle();
// 0.1 + 0.2 klasiği: ondalıkla çalışsaydık 0.30000000000000004 çıkardı.
V.kayitEkle({ tur: "gelir", tutar: "0,10", tarih: "2026-08-01" });
V.kayitEkle({ tur: "gelir", tutar: "0,20", tarih: "2026-08-01" });
esit("0,10 + 0,20", V.kurusYaz(V.toplamVarlik(V.kayitlariOku())), "0,30 ₺");
// 100 kere 19,99 -> tam 1.999,00 olmalı
depoyuTemizle();
for (let i = 0; i < 100; i++) V.kayitEkle({ tur: "gelir", tutar: "19,99", tarih: "2026-08-01" });
esit("100 x 19,99", V.kurusYaz(V.toplamVarlik(V.kayitlariOku())), "1.999,00 ₺");

// ============================================================
// 4,5) YEDEKLEME
// ============================================================

baslik("yedekMetni — depo dosya metnine çevriliyor mu?");
depoyuTemizle();
V.kayitEkle({ tur: "gelir", tutar: 1000, tarih: "2026-08-01", aciklama: "Maaş" });
V.kayitEkle({ tur: "gider", tutar: "250,50", tarih: "2026-08-02", kategori: "Market" });
const yedek = V.yedekMetni();
// Yedek artık bir zarf: { surum, olusturma, kayitlar }.
esit("üretilen metin JSON olarak geri okunuyor", JSON.parse(yedek).kayitlar.length, 2);
esit("zarfta sürüm yazıyor", JSON.parse(yedek).surum, V.SURUM);
dogru("zarfta oluşturma tarihi var", /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(yedek).olusturma));
dogru("insan da okusun diye girintili", yedek.includes("\n  "));

baslik("yedekOku — sağlam yedek doğru okunuyor mu?");
depoyuTemizle(); // depo boşken okuyalım ki "yazmıyor" iddiasını sınayabilelim
const geriGelen = V.yedekOku(yedek);
esit("kayıt sayısı", geriGelen.kayitlar.length, 2);
esit("depoya kendiliğinden YAZMADI (yazma kararı arayüzün)", V.kayitlariOku().length, 0);
esit("kuruş aynen korundu", geriGelen.kayitlar[1].kurus, 25050);
esit("Türkçe açıklama korundu", geriGelen.kayitlar[0].aciklama, "Maaş");
esit("kategori korundu", geriGelen.kayitlar[1].kategori, "Market");
esit(
  "eksik açıklama boşla tamamlanıyor",
  V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"2026-01-01"}]').kayitlar[0].aciklama,
  ""
);

baslik("yedekOku — bozuk yedek reddedilmeli (depo korunur)");
hataAtmali("JSON değil", () => V.yedekOku("bu json degil"));
hataAtmali("liste değil", () => V.yedekOku('{"a":1}'));
hataAtmali("kimlik yok", () => V.yedekOku('[{"tur":"gelir","kurus":100,"tarih":"2026-01-01"}]'));
hataAtmali("geçersiz tür", () => V.yedekOku('[{"id":"x","tur":"hediye","kurus":100,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş ondalıklı", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":10.5,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş eksi", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":-5,"tarih":"2026-01-01"}]'));
hataAtmali("kuruş yazı", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":"100","tarih":"2026-01-01"}]'));
hataAtmali("tarih bozuk", () => V.yedekOku('[{"id":"x","tur":"gelir","kurus":100,"tarih":"01.01.2026"}]'));

baslik("yedekOku — eski biçim kabul, gelecek sürüm ret");
// Eski (1. etap) yedekler çıplak listeydi. Kimsenin eski dosyası çöp olmasın.
const eskiYedek = '[{"id":"e1","tur":"gelir","kurus":500,"tarih":"2026-05-01"}]';
esit("eski biçim okunuyor", V.yedekOku(eskiYedek).kayitlar.length, 1);
esit("eski biçimde bütçeler boş geliyor", Object.keys(V.yedekOku(eskiYedek).butceler).length, 0);
hataAtmali("gelecekten gelen yedek (surum 3)", () => V.yedekOku('{"surum":3,"kayitlar":[]}'));

// ============================================================
// 4,7) DEPO v2 — KÖK NESNE VE TAŞIMA
// ============================================================

baslik("bosDepo — iskelet tam mı?");
const iskelet = V.bosDepo();
esit("surum", iskelet.surum, V.SURUM);
esit("kayitlar boş dizi", Array.isArray(iskelet.kayitlar) && iskelet.kayitlar.length, 0);
dogru("butceler boş nesne", typeof iskelet.butceler === "object" && !Array.isArray(iskelet.butceler));
esit("sablonlar boş dizi", iskelet.sablonlar.length, 0);

baslik("depoyuTasi — rafta ne bulursa bugünün biçimine çevirir");
const tasinan = V.depoyuTasi([{ id: "t1" }]);
esit("düz dizi (v1) kayıtlara giriyor", tasinan.kayitlar.length, 1);
esit("v1'den gelen bütçe boş", Object.keys(tasinan.butceler).length, 0);
esit("null -> boş depo", V.depoyuTasi(null).kayitlar.length, 0);
esit("yazı -> boş depo", V.depoyuTasi("çöp").kayitlar.length, 0);
esit("kayitlar dizi değilse boşlanır", V.depoyuTasi({ kayitlar: "çöp" }).kayitlar.length, 0);
dogru("tanınmayan alan içeri alınmıyor", !("carpik" in V.depoyuTasi({ carpik: 5 })));
esit("bilinen bütçe korunuyor", V.depoyuTasi({ butceler: { Market: 100 } }).butceler.Market, 100);
esit("butceler dizi gelirse reddedilir", Object.keys(V.depoyuTasi({ butceler: [1, 2] }).butceler).length, 0);
esit("sablonlar korunuyor", V.depoyuTasi({ sablonlar: [{ id: "s" }] }).sablonlar.length, 1);

baslik("v1 rafından v2 rafına taşıma");
depoyuTemizle();
const eskiVeri = JSON.stringify([
  { id: "m1", tur: "gelir", kurus: 1000, tarih: "2026-08-01", aciklama: "", kategori: "" },
  { id: "m2", tur: "gider", kurus: 500, tarih: "2026-08-02", aciklama: "", kategori: "Market" },
]);
localStorage.setItem(V.ESKI_ANAHTAR, eskiVeri);
esit("eski kayıtlar okunuyor", V.kayitlariOku().length, 2);
esit("v2 rafı artık dolu", typeof localStorage.getItem(V.DEPO_ANAHTARI), "string");
esit("v1 rafı SİLİNMEDİ (kurtarma kopyası)", localStorage.getItem(V.ESKI_ANAHTAR), eskiVeri);
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-03" });
esit("yeni kayıt v2'ye eklendi", V.kayitlariOku().length, 3);
esit("v1 rafı hâlâ eski hâlinde (yeniden taşıma yok)", localStorage.getItem(V.ESKI_ANAHTAR), eskiVeri);

baslik("kayitlariYaz bütçe ve şablonları SİLMİYOR (oku-değiştir-yaz)");
depoyuTemizle();
const doluDepo = V.bosDepo();
doluDepo.butceler = { Market: 12345 };
doluDepo.sablonlar = [{ id: "s1" }];
V.depoYaz(doluDepo);
V.kayitEkle({ tur: "gider", tutar: 50, tarih: "2026-08-01", kategori: "Market" });
esit("kayıt eklendi", V.kayitlariOku().length, 1);
esit("bütçe hayatta", V.depoOku().butceler.Market, 12345);
esit("şablon hayatta", V.depoOku().sablonlar.length, 1);

baslik("depoYaz — depo doluyken anlaşılır hata");
// Node taklidimizin kotası yok; setItem'ı geçici olarak bozup gerçek
// tarayıcıdaki "depo doldu" durumunu canlandırıyoruz.
const gercekSetItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
hataAtmali("dolu depoda Türkçe mesaj", () => V.depoYaz(V.bosDepo()));
localStorage.setItem = gercekSetItem;

baslik("kurusSade — işaretsiz yazım");
esit("125050", V.kurusSade(125050), "1.250,50");
esit("0", V.kurusSade(0), "0,00");

// ============================================================
// 4,8) BÜTÇELER
// ============================================================

baslik("butceBelirle ve butceleriOku");
depoyuTemizle();
esit("başta bütçe yok", Object.keys(V.butceleriOku()).length, 0);
esit("limit koy (TL yazısıyla)", V.butceBelirle("Market", "5.000"), 500000);
esit("okunuyor", V.butceleriOku().Market, 500000);
esit("limit güncelle", V.butceBelirle("Market", "6.000"), 600000);
esit("boş yazı limiti siler", V.butceBelirle("Market", ""), 0);
esit("silindi", V.butceleriOku().Market, undefined);
V.butceBelirle("Kira", 2000);
esit('"0" da siler', V.butceBelirle("Kira", "0"), 0);
hataAtmali("bilinmeyen kategori", () => V.butceBelirle("Tatil", 100));
hataAtmali("saçma tutar", () => V.butceBelirle("Market", "abc"));
hataAtmali("eksi limit", () => V.butceBelirle("Market", "-5"));

baslik("butceDurumAdi — üç durum ve sınırları");
esit("uyarı eşiği %80", V.UYARI_ORANI, 0.8);
esit("butceleriDenetle bayat anahtarı atlıyor", Object.keys(V.butceleriDenetle({ Tatil: 5 })).length, 0);
esit("butceleriDenetle eksik bölümü boşluyor", Object.keys(V.butceleriDenetle(undefined)).length, 0);
esit("altında: iyi", V.butceDurumAdi(100, 1000), "iyi");
esit("tam %80 sınırında: uyari", V.butceDurumAdi(800, 1000), "uyari");
esit("limitin tamamı ama aşmadı: uyari", V.butceDurumAdi(1000, 1000), "uyari");
esit("1 kuruş aşınca: asildi", V.butceDurumAdi(1001, 1000), "asildi");

baslik("butceDurumu — ay bazlı bütçe tablosu");
depoyuTemizle();
V.kayitEkle({ tur: "gider", tutar: 1200, tarih: "2026-08-10", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 400, tarih: "2026-08-12", kategori: "Market" });
V.kayitEkle({ tur: "gider", tutar: 300, tarih: "2026-07-10", kategori: "Market" }); // başka ay
V.kayitEkle({ tur: "gelir", tutar: 9999, tarih: "2026-08-11" }); // gelir bütçeye girmez
V.kayitEkle({ tur: "gider", tutar: 50, tarih: "2026-08-11", kategori: "Fatura" }); // limitsiz kategori
const denenecekButceler = { Market: 200000, Kira: 150000, Tatil: 100 }; // Tatil: bayat anahtar
const butceTablosu = V.butceDurumu(V.kayitlariOku(), denenecekButceler, 2026, 8);
esit("sadece limitli VE tanınan kategoriler", butceTablosu.length, 2);
esit("sıra KATEGORILER sırası (Market önce)", butceTablosu[0].kategori, "Market");
esit("harcanan sadece Ağustos gideri", butceTablosu[0].harcanan, 160000);
esit("yüzde tam sayı", butceTablosu[0].yuzde, 80);
esit("tam %80'de durum uyarı", butceTablosu[0].durum, "uyari");
esit("Kira harcaması yok", butceTablosu[1].harcanan, 0);
esit("Kira kalan = limit", butceTablosu[1].kalan, 150000);
esit("Kira durumu iyi", butceTablosu[1].durum, "iyi");
const asilan = V.butceDurumu(
  [{ tur: "gider", kategori: "Market", kurus: 250000, tarih: "2026-08-01" }],
  { Market: 200000 },
  2026,
  8
);
esit("aşınca durum", asilan[0].durum, "asildi");
dogru("kalan eksiye düşüyor", asilan[0].kalan < 0);
esit("yüzde 100'ü aşabiliyor", asilan[0].yuzde, 125);
esit("boş kayıtla boş bütçe", V.butceDurumu([], {}, 2026, 8).length, 0);

baslik("bütçeler yedeğe girip çıkıyor");
depoyuTemizle();
V.butceBelirle("Market", "1.000");
V.kayitEkle({ tur: "gelir", tutar: 10, tarih: "2026-08-01" });
const butceliYedek = V.yedekMetni();
esit("zarfta bütçe var", JSON.parse(butceliYedek).butceler.Market, 100000);
depoyuTemizle();
esit("bütçe geri geliyor", V.yedekOku(butceliYedek).butceler.Market, 100000);
hataAtmali("bozuk bütçe limiti reddedilir", () =>
  V.yedekOku('{"surum":2,"kayitlar":[],"butceler":{"Market":10.5}}')
);
esit(
  "bayat bütçe kategorisi sessizce atlanır",
  Object.keys(V.yedekOku('{"surum":2,"kayitlar":[],"butceler":{"Tatil":100}}').butceler).length,
  0
);
hataAtmali("bütçe bölümü dizi gelirse reddedilir", () =>
  V.yedekOku('{"surum":2,"kayitlar":[],"butceler":[1]}')
);

// ============================================================
// 5) DOSYALAR BİRBİRİYLE UYUMLU MU?
// ============================================================
//
// En sinsi hata türü: HTML'de id="alan-tutar" yazıp JavaScript'te
// bul("alan-tutari") demek. Hiçbir hata mesajı çıkmaz, sadece çalışmaz.
// Bu bölüm o tür uyuşmazlıkları yakalar.

const oku = (ad) => fs.readFileSync(path.join(__dirname, ad), "utf8");
const html = oku("index.html");
const css = oku("style.css");

// Yorumları atıyoruz: yorum içinde geçen örnek kod gerçek çağrı sanılmasın.
const js = oku("app.js")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const tumEslesmeler = (metin, kalip) => [...metin.matchAll(kalip)].map((m) => m[1]);

const htmlIdListesi = tumEslesmeler(html, /\sid="([^"]+)"/g);
const htmlIdler = new Set(htmlIdListesi);
const htmlSiniflar = new Set(tumEslesmeler(html, /\sclass="([^"]+)"/g).flatMap((s) => s.split(/\s+/)));
const sekmeAdlari = tumEslesmeler(html, /data-sekme="([^"]+)"/g);

// Sadece JavaScript'in tutunması için var olan sınıflar; CSS kuralı beklemiyoruz.
const SADECE_KANCA = new Set(["sayfa"]);

baslik("script sırası (veri.js app.js'ten önce olmalı)");
const veriSira = html.indexOf('src="veri.js"');
const appSira = html.indexOf('src="app.js"');
dogru("veri.js index.html'de var", veriSira !== -1);
dogru("app.js index.html'de var", appSira !== -1);
dogru("veri.js önce yükleniyor", veriSira !== -1 && appSira !== -1 && veriSira < appSira);

baslik("app.js'in aradığı id'ler HTML'de var mı?");
const arananIdler = new Set([
  ...tumEslesmeler(js, /\bbul\("([^"]+)"\)/g),
  ...tumEslesmeler(js, /getElementById\("([^"]+)"\)/g),
]);
for (const id of arananIdler) dogru(`bul("${id}")`, htmlIdler.has(id));
for (const ad of sekmeAdlari) dogru(`sayfa-${ad} bölümü var`, htmlIdler.has("sayfa-" + ad));

baslik("app.js'in aradığı sınıflar HTML'de var mı?");
for (const s of new Set(tumEslesmeler(js, /querySelectorAll\("\.([\w-]+)"\)/g))) {
  dogru("." + s, htmlSiniflar.has(s));
}

baslik("HTML sınıfları CSS'te tanımlı mı? (yazım hatası yakalar)");
for (const s of htmlSiniflar) {
  if (SADECE_KANCA.has(s)) {
    console.log(`  ATLA  .${s} (sadece JS kancası, CSS kuralı gerekmiyor)`);
    continue;
  }
  dogru("." + s, css.includes("." + s));
}

baslik("JavaScript'in eklediği sınıflar CSS'te tanımlı mı?");
for (const s of ["gizli", "aktif", "eksi"]) dogru("." + s, css.includes("." + s));

baslik("app.js'in ÜRETTİĞİ satırların sınıfları CSS'te tanımlı mı?");
// Liste satırları createElement ile üretiliyor, yani index.html'de yok.
// Yukarıdaki HTML taraması onları göremez; burada app.js'teki className
// atamalarını tarıyoruz.
const uretilenSiniflar = new Set();
for (const parca of tumEslesmeler(js, /className\s*=\s*"([^"]+)"/g)) {
  for (const ad of parca.trim().split(/\s+/)) {
    // "tutar-" gibi yarım isimler: sonuna değişken ekleniyor, aşağıda ayrı bakıyoruz.
    if (ad.endsWith("-")) continue;
    uretilenSiniflar.add(ad);
  }
}
for (const s of uretilenSiniflar) dogru("." + s, css.includes("." + s));

// Yarım kalan "tutar-" + tur birleşimlerinin üç hâli de tanımlı olmalı.
for (const tur of V.TURLER) dogru(".tutar-" + tur, css.includes(".tutar-" + tur));

// Aynı oyun bütçe çubuğunda: "butce-" + durum birleşiminin üç hâli.
for (const durum of V.BUTCE_DURUMLARI) dogru(".butce-" + durum, css.includes(".butce-" + durum));

baslik("id'ler tekil mi?");
esit(`${htmlIdListesi.length} id`, htmlIdListesi.length, htmlIdler.size);

baslik("form türleri veri.js'teki TURLER ile aynı mı?");
const formTurleri = tumEslesmeler(html, /name="tur" value="([^"]+)"/g);
esit("HTML türleri", formTurleri.join(","), V.TURLER.join(","));

baslik("kategori seçenekleri HTML'e elle yazılmamış mı?");
// Kategoriler tek kaynaktan (veri.js) gelsin; HTML'de <option> olmamalı.
dogru("index.html'de <option> yok", !html.includes("<option"));

baslik("renkler tek yerde mi?");
// Kural: her renk :root bloğunda tanımlanır, aşağıda var(--isim) ile
// çağrılır. Böylece ana rengi değiştirmek tek satırlık iş oluyor.
// Bu denetim olmasa zamanla renkler dosyaya dağılır ve bir gün
// "mavi yaptım ama bir yer hâlâ yeşil" diye uğraşırız.
const cssYorumsuz = css.replace(/\/\*[\s\S]*?\*\//g, "");
const cssRootsuz = cssYorumsuz.replace(/:root\s*\{[\s\S]*?\}/, "");
const kacakRenkler = [...cssRootsuz.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
esit(":root dışında ham renk kodu", kacakRenkler.length, 0);
if (kacakRenkler.length > 0) console.log("        kaçaklar:", kacakRenkler.join(", "));
dogru(":root bloğu var", /:root\s*\{/.test(cssYorumsuz));

baslik("CSS'te kullanılmayan sınıf kalmış mı?");
// Ters yön denetim: CSS'te kural yazdığımız her sınıf gerçekten
// bir yerde kullanılıyor mu? Ölü kod birikmesini engelliyor.
const cssSiniflar = new Set([...cssYorumsuz.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
// JavaScript'te parça parça kurulan sınıflar ("tutar-" + tur,
// "butce-" + durum) düz arama ile bulunamaz; onları yukarıda ayrıca
// doğruladık.
const DINAMIK_SINIFLAR = new Set([
  ...V.TURLER.map((t) => "tutar-" + t),
  ...V.BUTCE_DURUMLARI.map((d) => "butce-" + d),
]);
const kullanilmayanCss = [...cssSiniflar].filter(
  (s) => !DINAMIK_SINIFLAR.has(s) && !html.includes(s) && !js.includes(s)
);
esit("kullanılmayan CSS sınıfı", kullanilmayanCss.length, 0);
if (kullanilmayanCss.length > 0) console.log("        kullanılmayanlar:", kullanilmayanCss.join(", "));

baslik("app.js'in çağırdığı her fonksiyon gerçekten var mı?");
//
// Dosyaları ikiye ayırınca yeni bir hata riski doğdu: veri.js'te bir
// fonksiyonun adını değiştirirsem app.js eski adı çağırmaya devam eder.
// Tarayıcı bunu ancak o satıra gelince fark eder — yani belki hiç.
// Burada app.js'teki tüm fonksiyon çağrılarını toplayıp, her birinin
// ya app.js'in kendisinde ya veri.js'te ya da tarayıcının hazır
// araçları arasında olduğunu doğruluyoruz.

// Tarayıcının/JavaScript'in hazır sundukları — bunlar zaten var.
const HAZIR_OLANLAR = new Set([
  "document", "setTimeout", "clearTimeout", "console", "alert", "confirm",
  "Number", "String", "Boolean", "Object", "Array", "JSON", "Math", "Date", "Intl", "Blob",
  // dil anahtar kelimeleri (parantezle geldikleri için çağrı gibi görünüyorlar)
  "if", "for", "while", "switch", "catch", "function", "return", "typeof", "new",
]);

// app.js'in kendi içinde tanımladığı fonksiyonlar
const appYerelleri = new Set(tumEslesmeler(js, /function\s+(\w+)\s*\(/g));
// veri.js'in dışa açtığı isimler
const veriIsimleri = new Set(Object.keys(V));

// "isim(" kalıbı — ama başında nokta olmayanlar (yani .forEach( sayılmaz)
const cagrilar = new Set(tumEslesmeler(js, /(?:^|[^.\w$])(\w+)\s*\(/gm));

let bilinmeyen = [];
for (const ad of cagrilar) {
  if (HAZIR_OLANLAR.has(ad) || appYerelleri.has(ad) || veriIsimleri.has(ad)) continue;
  bilinmeyen.push(ad);
}
esit("tanımı bulunamayan çağrı sayısı", bilinmeyen.length, 0);
if (bilinmeyen.length > 0) console.log("        bulunamayanlar:", bilinmeyen.join(", "));

// Ters yön: veri.js'in dışa açtığı ama app.js'te de testlerde de hiç
// kullanılmayan bir şey var mı? (ölü kod uyarısı — hata değil, bilgi)
const testKodu = oku("testler.js");
const kullanilmayan = [...veriIsimleri].filter(
  (ad) => !js.includes(ad) && !testKodu.includes("V." + ad)
);
if (kullanilmayan.length > 0) {
  console.log("        [bilgi] veri.js'te kullanılmayan:", kullanilmayan.join(", "));
} else {
  console.log("        [bilgi] veri.js'te kullanılmayan fonksiyon yok");
}

// ============================================================
// 6) PWA — kimlik kartı, ikonlar ve çevrimdışı bekçisi
// ============================================================

baslik("manifest.json geçerli mi?");
let manifest = null;
try {
  manifest = JSON.parse(oku("manifest.json"));
  gecen++;
  console.log("  OK    JSON okunabildi");
} catch (e) {
  basarisiz++;
  console.log("  HATA  manifest.json bozuk: " + e.message);
}

if (manifest) {
  for (const alan of ["name", "short_name", "start_url", "scope", "display", "icons", "theme_color", "background_color"]) {
    dogru(`"${alan}" alanı var`, manifest[alan] !== undefined);
  }
  esit('display "standalone"', manifest.display, "standalone");
  esit('lang "tr"', manifest.lang, "tr");

  // GitHub Pages adresi site.github.io/proje-adi/ şeklinde, yani
  // uygulama kök dizinde DEĞİL. Yollar "/" ile başlarsa yayında kırılır.
  dogru('start_url göreli ("./" ile başlıyor)', String(manifest.start_url).startsWith("./"));
  dogru('scope göreli ("./" ile başlıyor)', String(manifest.scope).startsWith("./"));

  baslik("manifest'teki ikon dosyaları gerçekten var mı?");
  for (const ikon of manifest.icons) {
    const varMi = fs.existsSync(path.join(__dirname, ikon.src));
    dogru(`${ikon.src} (${ikon.sizes}, ${ikon.purpose})`, varMi);
    dogru(`${ikon.src} yolu göreli`, !ikon.src.startsWith("/"));
  }
  // Telefonun ikonu daire/kare kırpması için maskable şart, yoksa
  // ikon kenarlarından kesilir.
  dogru("maskable ikon var", manifest.icons.some((i) => String(i.purpose).includes("maskable")));

  baslik("theme_color üç yerde de aynı mı?");
  // Aynı renk manifest'te, index.html'de ve style.css'te yazılı.
  // Biri değişip diğerleri kalırsa durum çubuğu uygulamayla uyumsuz görünür.
  const metaRenk = (html.match(/name="theme-color"\s+content="([^"]+)"/) || [])[1];
  const cssVurgu = (css.match(/--vurgu:\s*(#[0-9a-fA-F]{3,8})/) || [])[1];
  esit("manifest.json theme_color", String(manifest.theme_color).toLowerCase(), String(metaRenk).toLowerCase());
  esit("style.css --vurgu", String(cssVurgu).toLowerCase(), String(metaRenk).toLowerCase());
}

// service-worker.js'in önbellek listesini bir kez ayrıştırıp aşağıdaki
// birkaç denetimde kullanıyoruz.
const swKod = oku("service-worker.js");
const listeMetni = (swKod.match(/const DOSYALAR = \[([\s\S]*?)\]/) || [])[1] || "";
const swDosyalar = [...listeMetni.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

baslik("yollar göreli mi? (GitHub Pages alt dizinde yayınlıyor)");
// GitHub Pages siteyi kullanici.github.io/depo-adi/ altında yayınlıyor.
// href="/style.css" gibi bir yol sitenin KÖKÜNE bakar, yani
// kullanici.github.io/style.css — orada dosya yok. Yayında her şey
// kırılır ve yerelde çalıştığı için sebebini bulmak zordur.
const mutlakYollar = [
  ...tumEslesmeler(html, /\shref="(\/[^/][^"]*)"/g),
  ...tumEslesmeler(html, /\ssrc="(\/[^/][^"]*)"/g),
];
esit("index.html'de / ile başlayan yol", mutlakYollar.length, 0);
if (mutlakYollar.length > 0) console.log("        mutlak yollar:", mutlakYollar.join(", "));

const swMutlak = swDosyalar.filter((y) => y.startsWith("/"));
esit("service worker listesinde / ile başlayan yol", swMutlak.length, 0);

dogru(".nojekyll dosyası var", fs.existsSync(path.join(__dirname, ".nojekyll")));

baslik("index.html PWA bağlantıları");
dogru("manifest.json bağlanmış", /rel="manifest"\s+href="manifest\.json"/.test(html));
dogru("apple-touch-icon var", html.includes('rel="apple-touch-icon"'));
dogru("theme-color meta var", html.includes('name="theme-color"'));

baslik("service worker dosya listesi doğru mu?");
// EN KRİTİK DENETİM: addAll listesindeki tek bir yol yanlışsa
// service worker HİÇ kurulmaz ve çevrimdışı çalışma sessizce çalışmaz.
dogru("DOSYALAR listesi bulundu", swDosyalar.length > 0);
for (const yol of swDosyalar) {
  if (yol === "./") {
    console.log('  ATLA  "./" (kök dizin, dosya değil)');
    continue;
  }
  dogru(yol, fs.existsSync(path.join(__dirname, yol.replace(/^\.\//, ""))));
}

baslik("önbelleğe alınması gereken hiçbir dosya atlanmamış mı?");
// Ters yön: projede olup listede olmayan bir dosya varsa o dosya
// çevrimdışıyken gelmez ve uygulama yarım açılır.
const ikonlar = fs
  .readdirSync(path.join(__dirname, "icons"))
  .filter((d) => d.endsWith(".png"))
  .map((d) => "icons/" + d);
const gerekenler = ["style.css", "veri.js", "app.js", "manifest.json", ...ikonlar];
const listedekiler = new Set(swDosyalar.map((y) => y.replace(/^\.\//, "")));
for (const d of gerekenler) dogru(d + " listede", listedekiler.has(d));

// index.html'i ayrı beklemiyoruz: "./" zaten onu getiriyor. Ama biri
// mutlaka listede olmalı, yoksa uygulama çevrimdışı hiç açılmaz.
dogru('ana sayfa listede ("./" veya index.html)', listedekiler.has("") || listedekiler.has("index.html"));
// Aynı dosyayı iki adresle saklamak yönlendirme sorunlarına yol açıyor.
dogru('"./" ve "index.html" ikisi birden yok', !(listedekiler.has("") && listedekiler.has("index.html")));

baslik("service worker kaydı ve önbellek yönetimi");
dogru("app.js service-worker.js'i kaydediyor", js.includes('register("./service-worker.js")'));
dogru("kayıt hatası yakalanıyor (file:// çökmesin)", /register\([^)]*\)\s*\.catch/.test(js));
dogru("önbellek adı sürümlü", /const ONBELLEK = "[^"]*v\d+"/.test(swKod));
dogru("install olayı var", swKod.includes('addEventListener("install"'));
dogru("activate olayı var", swKod.includes('addEventListener("activate"'));
dogru("fetch olayı var", swKod.includes('addEventListener("fetch"'));
dogru("eski önbellekler siliniyor", swKod.includes("caches.delete"));
dogru("sadece başarılı yanıtlar önbelleğe giriyor", swKod.includes("yanit.ok"));
dogru("çevrimdışı yedek olarak önbelleğe düşülüyor", swKod.includes("caches.match"));

// ============================================================
// SONUÇ
// ============================================================

console.log("\n" + "-".repeat(52));
if (basarisiz === 0) {
  console.log(`TÜMÜ GEÇTİ — ${gecen} test`);
  process.exit(0);
} else {
  console.log(`GEÇEN: ${gecen}   BAŞARISIZ: ${basarisiz}`);
  process.exit(1);
}
